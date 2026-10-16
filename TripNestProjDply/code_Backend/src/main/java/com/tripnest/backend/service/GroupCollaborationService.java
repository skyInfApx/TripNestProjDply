package com.tripnest.backend.service;

import com.tripnest.backend.dto.group.AddMemberRequest;
import com.tripnest.backend.dto.group.GroupCreateRequest;
import com.tripnest.backend.dto.group.GroupDetailsResponse;
import com.tripnest.backend.dto.group.GroupInvitationResponse;
import com.tripnest.backend.dto.group.GroupJoinRequest;
import com.tripnest.backend.dto.group.GroupMemberResponse;
import com.tripnest.backend.entity.*;
import com.tripnest.backend.repository.GroupInvitationRepository;
import com.tripnest.backend.repository.GroupMemberRepository;
import com.tripnest.backend.repository.TravelGroupRepository;
import com.tripnest.backend.repository.TripRepository;
import com.tripnest.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Service handling travel group collaboration:
 * 1. Initializing a group for a trip and generating unique join codes.
 * 2. Asynchronous onboarding: Admin invitations (invitee acceptance) & Join requests (admin approval).
 * 3. Fetching group details and member rosters.
 * 4. Promoting members to Admin and managing group departures.
 */
@Service
public class GroupCollaborationService {

    private final TravelGroupRepository travelGroupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupInvitationRepository groupInvitationRepository;
    private final NotificationService notificationService;
    private final TripRepository tripRepository;
    private final UserRepository userRepository;

    private static final String CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int CODE_LENGTH = 6;
    private final SecureRandom random = new SecureRandom();

    public GroupCollaborationService(
            TravelGroupRepository travelGroupRepository,
            GroupMemberRepository groupMemberRepository,
            GroupInvitationRepository groupInvitationRepository,
            NotificationService notificationService,
            TripRepository tripRepository,
            UserRepository userRepository) {
        this.travelGroupRepository = travelGroupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.groupInvitationRepository = groupInvitationRepository;
        this.notificationService = notificationService;
        this.tripRepository = tripRepository;
        this.userRepository = userRepository;
    }

    /**
     * Initializes a travel group for a trip and adds the creator as GROUP_OWNER.
     */
    @Transactional
    public GroupDetailsResponse createGroup(Long tripId, GroupCreateRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        Trip trip = getTripById(tripId);

        // Security check: Only the trip creator can initialize the group
        if (!trip.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Only the trip owner can create a travel group for this trip.");
        }

        // Prevent creating multiple groups for the same trip (1 Trip = 1 Group)
        if (travelGroupRepository.existsByTripId(tripId)) {
            throw new RuntimeException("A travel group already exists for this trip.");
        }

        // Generate collision-free join code (e.g. "GOA-842" or "TRIP-592")
        String uniqueCode = generateUniqueJoinCode(trip.getDestination());

        TravelGroup group = TravelGroup.builder()
                .trip(trip)
                .name(request.getName().trim())
                .joinCode(uniqueCode)
                .build();

        TravelGroup savedGroup = travelGroupRepository.save(group);

        // Automatically enroll the trip owner as the GROUP_OWNER
        GroupMember ownerMember = GroupMember.builder()
                .group(savedGroup)
                .user(user)
                .role(GroupRole.GROUP_OWNER)
                .build();

        GroupMember savedOwner = groupMemberRepository.save(ownerMember);

        return mapToGroupDetailsResponse(savedGroup, List.of(savedOwner));
    }

    /**
     * Updates the name of an existing travel group.
     * Accessible by GROUP_OWNER and GROUP_ADMIN.
     */
    @Transactional
    public GroupDetailsResponse updateGroupName(Long tripId, GroupCreateRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("No travel group found for this trip."));

        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), user.getId())
                .orElseThrow(() -> new RuntimeException("You are not a member of this travel group."));

        if (callerMember.getRole() != GroupRole.GROUP_OWNER && callerMember.getRole() != GroupRole.GROUP_ADMIN) {
            throw new RuntimeException("Only Group Owners and Admins can update the group name.");
        }

        group.setName(request.getName().trim());
        TravelGroup updated = travelGroupRepository.save(group);

        List<GroupMember> members = groupMemberRepository.findByGroupId(group.getId());
        return mapToGroupDetailsResponse(updated, members);
    }

    /**
     * Retrieves the group details and member roster for a specific trip.
     */
    @Transactional
    public GroupDetailsResponse getGroupByTripId(Long tripId, String userEmail) {
        User user = getUserByEmail(userEmail);
        Trip trip = getTripById(tripId);

        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("No travel group has been initialized for this trip yet."));

        // Verify that the requesting user is either the trip owner or a group member
        boolean isMember = groupMemberRepository.existsByGroupIdAndUserId(group.getId(), user.getId());
        boolean isOwner = trip.getOwner().getId().equals(user.getId());

        if (!isMember && !isOwner) {
            throw new RuntimeException("You must be an invited member of this group to view its details.");
        }

        List<GroupMember> members = groupMemberRepository.findByGroupId(group.getId());
        if (trip.getNumberOfTravelers() == null || trip.getNumberOfTravelers() < members.size()) {
            syncTripTravelerCount(group, members.size());
        }
        return mapToGroupDetailsResponse(group, members);
    }

    /**
     * Universal Group Search: Finds groups by numeric Group ID, exact Join Code, or partial Group Name.
     */
    @Transactional(readOnly = true)
    public List<GroupDetailsResponse> searchGroups(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }

        String cleanQuery = query.trim();
        Set<TravelGroup> matchedGroups = new LinkedHashSet<>();

        // 1. If numeric, search by Group ID
        if (cleanQuery.matches("\\d+")) {
            travelGroupRepository.findById(Long.parseLong(cleanQuery)).ifPresent(matchedGroups::add);
        }

        // 2. Search by exact Join Code (e.g. "SHI-3YZ3")
        travelGroupRepository.findByJoinCode(cleanQuery.toUpperCase()).ifPresent(matchedGroups::add);

        // 3. Search by partial Group Name (e.g. "Shimla" or "Explorers")
        List<TravelGroup> byName = travelGroupRepository.findByNameContainingIgnoreCase(cleanQuery);
        matchedGroups.addAll(byName);

        // Map all unique matches to GroupDetailsResponse
        return matchedGroups.stream()
                .map(group -> {
                    List<GroupMember> members = groupMemberRepository.findByGroupId(group.getId());
                    return mapToGroupDetailsResponse(group, members);
                })
                .collect(Collectors.toList());
    }

    /**
     * Allows a companion to join an existing group using the 6-character code.
     */
    @Transactional
    public GroupDetailsResponse joinGroupByCode(GroupJoinRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        String cleanCode = request.getJoinCode().trim().toUpperCase();

        TravelGroup group = travelGroupRepository.findByJoinCode(cleanCode)
                .orElseThrow(() -> new RuntimeException("Invalid join code. No active travel group found matching: " + cleanCode));

        // Prevent duplicate joins
        if (groupMemberRepository.existsByGroupIdAndUserId(group.getId(), user.getId())) {
            throw new RuntimeException("You are already a member of this travel group!");
        }

        // Add new companion with default role GROUP_MEMBER
        GroupMember newMember = GroupMember.builder()
                .group(group)
                .user(user)
                .role(GroupRole.GROUP_MEMBER)
                .build();

        groupMemberRepository.save(newMember);

        List<GroupMember> allMembers = groupMemberRepository.findByGroupId(group.getId());
        syncTripTravelerCount(group, allMembers.size());
        return mapToGroupDetailsResponse(group, allMembers);
    }

    /**
     * Allows GROUP_OWNER or GROUP_ADMIN to directly add a companion by their registered email.
     */
    @Transactional
    public GroupDetailsResponse addMemberByAdmin(Long tripId, AddMemberRequest request, String callerEmail) {
        User caller = getUserByEmail(callerEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("No travel group found for this trip."));

        // Verify caller is GROUP_OWNER or GROUP_ADMIN
        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not a member of this travel group."));

        if (callerMember.getRole() != GroupRole.GROUP_OWNER && callerMember.getRole() != GroupRole.GROUP_ADMIN) {
            throw new RuntimeException("Only Group Owners and Admins can directly add members.");
        }

        // Look up the target companion by email
        String targetEmail = request.getEmail().trim().toLowerCase();
        User targetUser = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new RuntimeException("No registered traveler found with email: " + request.getEmail()));

        // Prevent duplicate addition
        if (groupMemberRepository.existsByGroupIdAndUserId(group.getId(), targetUser.getId())) {
            throw new RuntimeException("User '" + targetUser.getName() + "' is already a member of this travel group!");
        }

        // Add companion as GROUP_MEMBER
        GroupMember newMember = GroupMember.builder()
                .group(group)
                .user(targetUser)
                .role(GroupRole.GROUP_MEMBER)
                .build();

        groupMemberRepository.save(newMember);

        List<GroupMember> allMembers = groupMemberRepository.findByGroupId(group.getId());
        syncTripTravelerCount(group, allMembers.size());
        return mapToGroupDetailsResponse(group, allMembers);
    }

    /**
     * Promotes or changes a member's role (only GROUP_OWNER can perform this).
     */
    @Transactional
    public GroupMemberResponse updateMemberRole(Long tripId, Long targetUserId, GroupRole newRole, String userEmail) {
        User caller = getUserByEmail(userEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("Travel group not found."));

        // Verify caller is GROUP_OWNER
        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not a member of this group."));

        if (callerMember.getRole() != GroupRole.GROUP_OWNER) {
            throw new RuntimeException("Only the Group Owner can promote or modify member roles.");
        }

        // Cannot demote the owner
        if (targetUserId.equals(caller.getId())) {
            throw new RuntimeException("Group Owner role cannot be altered.");
        }

        GroupMember targetMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user is not in this group."));

        targetMember.setRole(newRole);
        GroupMember updated = groupMemberRepository.save(targetMember);

        return mapToMemberResponse(updated);
    }

    /**
     * Removes a member from the group or allows a companion to leave.
     */
    @Transactional
    public void removeMember(Long tripId, Long targetUserId, String userEmail) {
        User caller = getUserByEmail(userEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("Travel group not found."));

        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not in this group."));

        GroupMember targetMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), targetUserId)
                .orElseThrow(() -> new RuntimeException("Target member not found in this group."));

        // Owner cannot be removed
        if (targetMember.getRole() == GroupRole.GROUP_OWNER) {
            throw new RuntimeException("The Group Owner cannot be removed from the trip group.");
        }

        // Permissions: Caller is removing themselves (leaving) OR caller is OWNER/ADMIN
        boolean isSelfRemoval = caller.getId().equals(targetUserId);
        boolean isAuthorizedLeader = (callerMember.getRole() == GroupRole.GROUP_OWNER || callerMember.getRole() == GroupRole.GROUP_ADMIN);

        if (!isSelfRemoval && !isAuthorizedLeader) {
            throw new RuntimeException("Only Group Owners and Admins can remove other companions.");
        }

        groupMemberRepository.delete(targetMember);
        syncTripTravelerCount(group, groupMemberRepository.findByGroupId(group.getId()).size());
    }

    /**
     * Admin invites a companion by email.
     * Creates a PENDING invitation and dispatches an in-app notification.
     * The invitee is NOT enrolled in group_members until they accept.
     */
    @Transactional
    public GroupInvitationResponse inviteMemberByAdmin(Long tripId, AddMemberRequest request, String callerEmail) {
        User caller = getUserByEmail(callerEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("No travel group found for this trip."));

        // Verify caller is GROUP_OWNER or GROUP_ADMIN
        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not a member of this travel group."));

        if (callerMember.getRole() != GroupRole.GROUP_OWNER && callerMember.getRole() != GroupRole.GROUP_ADMIN) {
            throw new RuntimeException("Only Group Owners and Admins can invite companions.");
        }

        // Look up target companion
        String targetEmail = request.getEmail().trim().toLowerCase();
        User targetUser = userRepository.findByEmail(targetEmail)
                .orElseThrow(() -> new RuntimeException("No registered traveler found with email: " + request.getEmail()));

        // Prevent duplicate addition if already active member
        if (groupMemberRepository.existsByGroupIdAndUserId(group.getId(), targetUser.getId())) {
            throw new RuntimeException("User '" + targetUser.getName() + "' is already a member of this travel group!");
        }

        // Check if there is already a PENDING invitation
        if (groupInvitationRepository.existsByGroupIdAndUserIdAndStatus(group.getId(), targetUser.getId(), InvitationStatus.PENDING)) {
            throw new RuntimeException("An active pending invitation or request already exists for " + targetUser.getName());
        }

        GroupRole roleToAssign = request.getRole() != null ? request.getRole() : GroupRole.GROUP_MEMBER;

        GroupInvitation invitation = GroupInvitation.builder()
                .group(group)
                .user(targetUser)
                .inviter(caller)
                .type(InvitationType.ADMIN_INVITATION)
                .status(InvitationStatus.PENDING)
                .role(roleToAssign)
                .build();

        GroupInvitation saved = groupInvitationRepository.save(invitation);

        // Send In-App Notification to the invitee
        try {
            notificationService.sendNotification(
                    targetUser,
                    "Trip Invitation: " + group.getName(),
                    caller.getName() + " invited you to join the travel squad for '" + group.getTrip().getTitle() + "'. Review and accept your invitation.",
                    NotificationType.TRIP_INVITE,
                    "GROUP_INVITATION",
                    saved.getId()
            );
        } catch (Exception ignored) {}

        return mapToInvitationResponse(saved);
    }

    /**
     * Traveler submits a join request using the 6-character code or search result.
     * Creates a PENDING join request and alerts all group admins.
     * The traveler is NOT enrolled in group_members until an admin approves.
     */
    @Transactional
    public GroupInvitationResponse requestJoinGroupByCode(GroupJoinRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        String cleanCode = request.getJoinCode().trim().toUpperCase();

        TravelGroup group = travelGroupRepository.findByJoinCode(cleanCode)
                .orElseThrow(() -> new RuntimeException("Invalid join code. No active travel group found matching: " + cleanCode));

        // Prevent duplicate joins if already a member
        if (groupMemberRepository.existsByGroupIdAndUserId(group.getId(), user.getId())) {
            throw new RuntimeException("You are already a member of this travel group!");
        }

        // Check if already has a pending join request
        if (groupInvitationRepository.existsByGroupIdAndUserIdAndStatus(group.getId(), user.getId(), InvitationStatus.PENDING)) {
            throw new RuntimeException("You already have a pending join request for this group. Please wait for an admin to approve.");
        }

        GroupInvitation joinRequest = GroupInvitation.builder()
                .group(group)
                .user(user)
                .inviter(null)
                .type(InvitationType.JOIN_REQUEST)
                .status(InvitationStatus.PENDING)
                .role(GroupRole.GROUP_MEMBER)
                .build();

        GroupInvitation saved = groupInvitationRepository.save(joinRequest);

        // Notify all Group Owners and Admins
        try {
            List<GroupMember> admins = groupMemberRepository.findByGroupId(group.getId()).stream()
                    .filter(m -> m.getRole() == GroupRole.GROUP_OWNER || m.getRole() == GroupRole.GROUP_ADMIN)
                    .collect(Collectors.toList());

            for (GroupMember admin : admins) {
                notificationService.sendNotification(
                        admin.getUser(),
                        "Join Request: " + group.getName(),
                        user.getName() + " has requested to join your travel squad for '" + group.getTrip().getTitle() + "'. Review and approve.",
                        NotificationType.GROUP_JOIN_REQUEST,
                        "TRIP",
                        group.getTrip().getId()
                );
            }
        } catch (Exception ignored) {}

        return mapToInvitationResponse(saved);
    }

    /**
     * Retrieves all pending invitations received by the current user.
     */
    @Transactional(readOnly = true)
    public List<GroupInvitationResponse> getPendingInvitationsForUser(String userEmail) {
        User user = getUserByEmail(userEmail);
        List<GroupInvitation> invites = groupInvitationRepository.findByUserIdAndTypeAndStatus(
                user.getId(),
                InvitationType.ADMIN_INVITATION,
                InvitationStatus.PENDING
        );

        return invites.stream()
                .map(this::mapToInvitationResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves pending join requests and outgoing invitations for a group (Admin view).
     */
    @Transactional(readOnly = true)
    public List<GroupInvitationResponse> getGroupInvitationsAndRequests(Long tripId, String callerEmail) {
        User caller = getUserByEmail(callerEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("Travel group not found."));

        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not in this group."));

        if (callerMember.getRole() != GroupRole.GROUP_OWNER && callerMember.getRole() != GroupRole.GROUP_ADMIN) {
            throw new RuntimeException("Only Group Owners and Admins can view invitations and join requests.");
        }

        List<GroupInvitation> list = groupInvitationRepository.findByGroupIdAndStatus(group.getId(), InvitationStatus.PENDING);
        return list.stream()
                .map(this::mapToInvitationResponse)
                .collect(Collectors.toList());
    }

    /**
     * Invitee accepts an invitation: Enrolls into group_members as active member.
     */
    @Transactional
    public GroupDetailsResponse acceptInvitation(Long invitationId, String userEmail) {
        User user = getUserByEmail(userEmail);
        GroupInvitation invitation = groupInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Invitation not found with ID: " + invitationId));

        if (!invitation.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to accept this invitation.");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("This invitation is no longer pending (current status: " + invitation.getStatus() + ").");
        }

        TravelGroup group = invitation.getGroup();

        // Enroll as active member if not already present
        if (!groupMemberRepository.existsByGroupIdAndUserId(group.getId(), user.getId())) {
            GroupMember newMember = GroupMember.builder()
                    .group(group)
                    .user(user)
                    .role(invitation.getRole() != null ? invitation.getRole() : GroupRole.GROUP_MEMBER)
                    .build();
            groupMemberRepository.save(newMember);
        }

        invitation.setStatus(InvitationStatus.ACCEPTED);
        groupInvitationRepository.save(invitation);

        // Notify inviter
        if (invitation.getInviter() != null) {
            try {
                notificationService.sendNotification(
                        invitation.getInviter(),
                        "Invitation Accepted! 🎉",
                        user.getName() + " accepted your invitation to join '" + group.getName() + "'.",
                        NotificationType.INVITATION_ACCEPTED,
                        "TRIP",
                        group.getTrip().getId()
                );
            } catch (Exception ignored) {}
        }

        List<GroupMember> allMembers = groupMemberRepository.findByGroupId(group.getId());
        syncTripTravelerCount(group, allMembers.size());
        return mapToGroupDetailsResponse(group, allMembers);
    }

    /**
     * Invitee declines an invitation.
     */
    @Transactional
    public void declineInvitation(Long invitationId, String userEmail) {
        User user = getUserByEmail(userEmail);
        GroupInvitation invitation = groupInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Invitation not found."));

        if (!invitation.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You are not authorized to decline this invitation.");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("This invitation is no longer pending.");
        }

        invitation.setStatus(InvitationStatus.REJECTED);
        groupInvitationRepository.save(invitation);

        if (invitation.getInviter() != null) {
            try {
                notificationService.sendNotification(
                        invitation.getInviter(),
                        "Invitation Declined",
                        user.getName() + " declined the invitation to join '" + invitation.getGroup().getName() + "'.",
                        NotificationType.INVITATION_DECLINED,
                        "TRIP",
                        invitation.getGroup().getTrip().getId()
                );
            } catch (Exception ignored) {}
        }
    }

    /**
     * Admin approves a traveler's join request: Enrolls them into group_members.
     */
    @Transactional
    public GroupDetailsResponse approveJoinRequest(Long tripId, Long invitationId, String callerEmail) {
        User caller = getUserByEmail(callerEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("Travel group not found."));

        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not in this group."));

        if (callerMember.getRole() != GroupRole.GROUP_OWNER && callerMember.getRole() != GroupRole.GROUP_ADMIN) {
            throw new RuntimeException("Only Group Owners and Admins can approve join requests.");
        }

        GroupInvitation invitation = groupInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Join request not found."));

        if (!invitation.getGroup().getId().equals(group.getId())) {
            throw new RuntimeException("Join request does not belong to this group.");
        }

        if (invitation.getStatus() != InvitationStatus.PENDING) {
            throw new RuntimeException("This request is no longer pending (status: " + invitation.getStatus() + ").");
        }

        User targetUser = invitation.getUser();

        // Enroll user into group_members
        if (!groupMemberRepository.existsByGroupIdAndUserId(group.getId(), targetUser.getId())) {
            GroupMember newMember = GroupMember.builder()
                    .group(group)
                    .user(targetUser)
                    .role(GroupRole.GROUP_MEMBER)
                    .build();
            groupMemberRepository.save(newMember);
        }

        invitation.setStatus(InvitationStatus.ACCEPTED);
        groupInvitationRepository.save(invitation);

        // Notify the approved traveler
        try {
            notificationService.sendNotification(
                    targetUser,
                    "Join Request Approved! 🎉",
                    "Your request to join '" + group.getName() + "' for '" + group.getTrip().getTitle() + "' was approved by " + caller.getName() + ". Welcome!",
                    NotificationType.JOIN_REQUEST_APPROVED,
                    "TRIP",
                    group.getTrip().getId()
            );
        } catch (Exception ignored) {}

        List<GroupMember> allMembers = groupMemberRepository.findByGroupId(group.getId());
        syncTripTravelerCount(group, allMembers.size());
        return mapToGroupDetailsResponse(group, allMembers);
    }

    /**
     * Admin rejects a traveler's join request.
     */
    @Transactional
    public void rejectJoinRequest(Long tripId, Long invitationId, String callerEmail) {
        User caller = getUserByEmail(callerEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("Travel group not found."));

        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not in this group."));

        if (callerMember.getRole() != GroupRole.GROUP_OWNER && callerMember.getRole() != GroupRole.GROUP_ADMIN) {
            throw new RuntimeException("Only Group Owners and Admins can reject join requests.");
        }

        GroupInvitation invitation = groupInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Join request not found."));

        if (!invitation.getGroup().getId().equals(group.getId())) {
            throw new RuntimeException("Join request does not belong to this group.");
        }

        invitation.setStatus(InvitationStatus.REJECTED);
        groupInvitationRepository.save(invitation);

        try {
            notificationService.sendNotification(
                    invitation.getUser(),
                    "Join Request Declined",
                    "Your request to join '" + group.getName() + "' was declined by the group admin.",
                    NotificationType.JOIN_REQUEST_REJECTED,
                    "TRIP",
                    group.getTrip().getId()
            );
        } catch (Exception ignored) {}
    }

    /**
     * Admin cancels an outgoing pending invitation.
     */
    @Transactional
    public void cancelInvitation(Long tripId, Long invitationId, String callerEmail) {
        User caller = getUserByEmail(callerEmail);
        TravelGroup group = travelGroupRepository.findByTripId(tripId)
                .orElseThrow(() -> new RuntimeException("Travel group not found."));

        GroupMember callerMember = groupMemberRepository.findByGroupIdAndUserId(group.getId(), caller.getId())
                .orElseThrow(() -> new RuntimeException("Caller is not in this group."));

        if (callerMember.getRole() != GroupRole.GROUP_OWNER && callerMember.getRole() != GroupRole.GROUP_ADMIN) {
            throw new RuntimeException("Only Group Owners and Admins can cancel invitations.");
        }

        GroupInvitation invitation = groupInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new RuntimeException("Invitation not found."));

        invitation.setStatus(InvitationStatus.CANCELLED);
        groupInvitationRepository.save(invitation);
    }

    public GroupInvitationResponse mapToInvitationResponse(GroupInvitation inv) {
        return GroupInvitationResponse.builder()
                .id(inv.getId())
                .groupId(inv.getGroup().getId())
                .groupName(inv.getGroup().getName())
                .joinCode(inv.getGroup().getJoinCode())
                .tripId(inv.getGroup().getTrip().getId())
                .tripTitle(inv.getGroup().getTrip().getTitle())
                .destination(inv.getGroup().getTrip().getDestination())
                .userId(inv.getUser().getId())
                .userName(inv.getUser().getName())
                .userEmail(inv.getUser().getEmail())
                .inviterId(inv.getInviter() != null ? inv.getInviter().getId() : null)
                .inviterName(inv.getInviter() != null ? inv.getInviter().getName() : null)
                .inviterEmail(inv.getInviter() != null ? inv.getInviter().getEmail() : null)
                .type(inv.getType())
                .status(inv.getStatus())
                .role(inv.getRole())
                .createdAt(inv.getCreatedAt())
                .build();
    }

    // --- HELPER METHODS ---

    /**
     * Generates a collision-free short code like "GOA-4821" or "MUM-7193".
     */
    private String generateUniqueJoinCode(String destination) {
        String prefix = "TRIP";
        if (destination != null && destination.trim().length() >= 3) {
            prefix = destination.trim().substring(0, 3).toUpperCase().replaceAll("[^A-Z]", "T");
        }

        String code;
        int attempts = 0;
        do {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 4; i++) {
                sb.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
            }
            code = prefix + "-" + sb.toString();
            attempts++;
            if (attempts > 20) {
                // Fallback to random 6 chars
                code = "TN" + (1000 + random.nextInt(9000));
                break;
            }
        } while (travelGroupRepository.existsByJoinCode(code));

        return code;
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found for email: " + email));
    }

    private Trip getTripById(Long tripId) {
        return tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found with ID: " + tripId));
    }

    private void syncTripTravelerCount(TravelGroup group, int memberCount) {
        if (group != null && group.getTrip() != null) {
            Trip trip = group.getTrip();
            trip.setNumberOfTravelers(Math.max(memberCount, 1));
            tripRepository.save(trip);
        }
    }

    private GroupDetailsResponse mapToGroupDetailsResponse(TravelGroup group, List<GroupMember> members) {
        List<GroupMemberResponse> memberResponses = members.stream()
                .map(this::mapToMemberResponse)
                .collect(Collectors.toList());

        return GroupDetailsResponse.builder()
                .id(group.getId())
                .tripId(group.getTrip().getId())
                .tripTitle(group.getTrip().getTitle())
                .destination(group.getTrip().getDestination())
                .name(group.getName())
                .joinCode(group.getJoinCode())
                .createdAt(group.getCreatedAt())
                .memberCount(members.size())
                .members(memberResponses)
                .build();
    }

    private GroupMemberResponse mapToMemberResponse(GroupMember member) {
        return GroupMemberResponse.builder()
                .id(member.getId())
                .userId(member.getUser().getId())
                .name(member.getUser().getName())
                .email(member.getUser().getEmail())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
