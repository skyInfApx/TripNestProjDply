package com.tripnest.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * GroupInvitation manages asynchronous onboarding consent:
 * 1. Admin sends invitation -> Stored with type=ADMIN_INVITATION, status=PENDING.
 *    Invitee must accept before being added to group_members.
 * 2. User enters join code/search -> Stored with type=JOIN_REQUEST, status=PENDING.
 *    Admin must approve before being added to group_members.
 *
 * Security: Prevents unauthorized or premature enrollment into trip and financial entities.
 */
@Entity
@Table(
    name = "group_invitations",
    indexes = {
        @Index(name = "idx_invitations_group_status", columnList = "group_id, status"),
        @Index(name = "idx_invitations_user_status", columnList = "user_id, status")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The travel group being joined
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup group;

    // The user who is invited or who requested to join
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // The group owner or admin who initiated the invite (null for self-initiated join requests)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "inviter_id")
    private User inviter;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private InvitationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    // Proposed role upon joining (GROUP_MEMBER by default, or GROUP_ADMIN if specified by inviter)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private GroupRole role = GroupRole.GROUP_MEMBER;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (updatedAt == null) {
            updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
