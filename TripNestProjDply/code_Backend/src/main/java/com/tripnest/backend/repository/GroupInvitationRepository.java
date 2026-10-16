package com.tripnest.backend.repository;

import com.tripnest.backend.entity.GroupInvitation;
import com.tripnest.backend.entity.InvitationStatus;
import com.tripnest.backend.entity.InvitationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GroupInvitationRepository extends JpaRepository<GroupInvitation, Long> {

    // Find all invitations for a group by status (e.g. all PENDING)
    List<GroupInvitation> findByGroupIdAndStatus(Long groupId, InvitationStatus status);

    // Find invitations for a group by type and status (e.g. JOIN_REQUEST and PENDING)
    List<GroupInvitation> findByGroupIdAndTypeAndStatus(Long groupId, InvitationType type, InvitationStatus status);

    // Find pending invitations received by a user (type=ADMIN_INVITATION, status=PENDING)
    List<GroupInvitation> findByUserIdAndTypeAndStatus(Long userId, InvitationType type, InvitationStatus status);

    // Check if an active pending invitation or request already exists
    boolean existsByGroupIdAndUserIdAndStatus(Long groupId, Long userId, InvitationStatus status);

    // Find existing pending invitation/request for a specific user and group
    Optional<GroupInvitation> findByGroupIdAndUserIdAndStatus(Long groupId, Long userId, InvitationStatus status);
}
