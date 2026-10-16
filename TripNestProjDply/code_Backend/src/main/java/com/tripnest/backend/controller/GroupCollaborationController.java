package com.tripnest.backend.controller;

import com.tripnest.backend.dto.group.AddMemberRequest;
import com.tripnest.backend.dto.group.GroupCreateRequest;
import com.tripnest.backend.dto.group.GroupDetailsResponse;
import com.tripnest.backend.dto.group.GroupInvitationResponse;
import com.tripnest.backend.dto.group.GroupJoinRequest;
import com.tripnest.backend.dto.group.GroupMemberResponse;
import com.tripnest.backend.entity.GroupRole;
import com.tripnest.backend.service.GroupCollaborationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller exposing group collaboration endpoints:
 * 1. POST   /api/trips/{tripId}/groups                -> Initialize travel group and generate join code
 * 2. GET    /api/trips/{tripId}/groups                -> View group details and member roster
 * 3. POST   /api/groups/join                          -> Join trip using 6-character code
 * 4. PUT    /api/trips/{tripId}/groups/members/{userId}/role -> Promote to Admin or update role
 * 5. DELETE /api/trips/{tripId}/groups/members/{userId}      -> Remove member or leave group
 */
@RestController
@CrossOrigin
public class GroupCollaborationController {

    private final GroupCollaborationService groupService;

    public GroupCollaborationController(GroupCollaborationService groupService) {
        this.groupService = groupService;
    }

    /**
     * Creates a travel group for a trip and returns the newly generated join code.
     */
    @PostMapping("/api/trips/{tripId}/groups")
    public ResponseEntity<GroupDetailsResponse> createGroup(
            @PathVariable Long tripId,
            @Valid @RequestBody GroupCreateRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.createGroup(tripId, request, userEmail);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieves the travel group, join code, and member roster for a trip.
     */
    @GetMapping("/api/trips/{tripId}/groups")
    public ResponseEntity<GroupDetailsResponse> getGroupByTripId(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.getGroupByTripId(tripId, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Updates the travel group name (accessible by GROUP_OWNER or GROUP_ADMIN).
     */
    @PutMapping("/api/trips/{tripId}/groups")
    public ResponseEntity<GroupDetailsResponse> updateGroupName(
            @PathVariable Long tripId,
            @Valid @RequestBody GroupCreateRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.updateGroupName(tripId, request, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Allows a traveler to join a group using the 6-character join code.
     */
    @PostMapping("/api/groups/join")
    public ResponseEntity<GroupDetailsResponse> joinGroupByCode(
            @Valid @RequestBody GroupJoinRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.joinGroupByCode(request, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Promotes or updates a group member's role (GROUP_OWNER only).
     */
    @PutMapping("/api/trips/{tripId}/groups/members/{userId}/role")
    public ResponseEntity<GroupMemberResponse> updateMemberRole(
            @PathVariable Long tripId,
            @PathVariable Long userId,
            @RequestParam GroupRole role,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupMemberResponse response = groupService.updateMemberRole(tripId, userId, role, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Removes a companion from the group or allows a member to leave.
     */
    @DeleteMapping("/api/trips/{tripId}/groups/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable Long tripId,
            @PathVariable Long userId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        groupService.removeMember(tripId, userId, userEmail);

        return ResponseEntity.noContent().build();
    }

    /**
     * Universal search for travel groups by Group ID, Join Code, or partial Group Name.
     */
    @GetMapping("/api/groups/search")
    public ResponseEntity<List<GroupDetailsResponse>> searchGroups(
            @RequestParam(required = false, defaultValue = "") String query) {

        List<GroupDetailsResponse> response = groupService.searchGroups(query);
        return ResponseEntity.ok(response);
    }

    /**
     * Directly adds a companion to the group by email (GROUP_OWNER or GROUP_ADMIN).
     */
    @PostMapping("/api/trips/{tripId}/groups/members")
    public ResponseEntity<GroupDetailsResponse> addMemberByAdmin(
            @PathVariable Long tripId,
            @Valid @RequestBody AddMemberRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.addMemberByAdmin(tripId, request, userEmail);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Sends an invitation to a companion by email (Double-consent flow: requires invitee acceptance).
     */
    @PostMapping("/api/trips/{tripId}/groups/invitations")
    public ResponseEntity<GroupInvitationResponse> sendInvitation(
            @PathVariable Long tripId,
            @Valid @RequestBody AddMemberRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupInvitationResponse response = groupService.inviteMemberByAdmin(tripId, request, userEmail);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Retrieves all pending join requests and outgoing invitations for this group (Admin view).
     */
    @GetMapping("/api/trips/{tripId}/groups/invitations")
    public ResponseEntity<List<GroupInvitationResponse>> getGroupInvitations(
            @PathVariable Long tripId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<GroupInvitationResponse> response = groupService.getGroupInvitationsAndRequests(tripId, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Admin approves a traveler's join request to enter the group.
     */
    @PostMapping("/api/trips/{tripId}/groups/invitations/{invitationId}/approve")
    public ResponseEntity<GroupDetailsResponse> approveJoinRequest(
            @PathVariable Long tripId,
            @PathVariable Long invitationId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.approveJoinRequest(tripId, invitationId, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Admin rejects a traveler's join request.
     */
    @PostMapping("/api/trips/{tripId}/groups/invitations/{invitationId}/reject")
    public ResponseEntity<Void> rejectJoinRequest(
            @PathVariable Long tripId,
            @PathVariable Long invitationId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        groupService.rejectJoinRequest(tripId, invitationId, userEmail);

        return ResponseEntity.noContent().build();
    }

    /**
     * Admin cancels an outgoing pending invitation.
     */
    @DeleteMapping("/api/trips/{tripId}/groups/invitations/{invitationId}")
    public ResponseEntity<Void> cancelInvitation(
            @PathVariable Long tripId,
            @PathVariable Long invitationId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        groupService.cancelInvitation(tripId, invitationId, userEmail);

        return ResponseEntity.noContent().build();
    }

    /**
     * Traveler submits a join request using a 6-character code (requires admin approval).
     */
    @PostMapping("/api/groups/join-request")
    public ResponseEntity<GroupInvitationResponse> requestJoinByCode(
            @Valid @RequestBody GroupJoinRequest request,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupInvitationResponse response = groupService.requestJoinGroupByCode(request, userEmail);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Traveler retrieves all pending trip invitations sent to them.
     */
    @GetMapping("/api/users/me/invitations")
    public ResponseEntity<List<GroupInvitationResponse>> getMyInvitations(
            Authentication authentication) {

        String userEmail = authentication.getName();
        List<GroupInvitationResponse> response = groupService.getPendingInvitationsForUser(userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Traveler accepts a trip invitation and joins the travel group.
     */
    @PostMapping("/api/users/me/invitations/{invitationId}/accept")
    public ResponseEntity<GroupDetailsResponse> acceptInvitation(
            @PathVariable Long invitationId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        GroupDetailsResponse response = groupService.acceptInvitation(invitationId, userEmail);

        return ResponseEntity.ok(response);
    }

    /**
     * Traveler declines a trip invitation.
     */
    @PostMapping("/api/users/me/invitations/{invitationId}/decline")
    public ResponseEntity<Void> declineInvitation(
            @PathVariable Long invitationId,
            Authentication authentication) {

        String userEmail = authentication.getName();
        groupService.declineInvitation(invitationId, userEmail);

        return ResponseEntity.noContent().build();
    }
}

