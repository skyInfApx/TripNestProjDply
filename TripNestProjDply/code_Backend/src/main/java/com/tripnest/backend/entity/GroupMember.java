package com.tripnest.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * GroupMember links an individual User to a TravelGroup.
 * It records their assigned role (OWNER, ADMIN, MEMBER) and the time they joined.
 *
 * Relationship: Many-to-One with TravelGroup, Many-to-One with User.
 * Database Constraint: Unique on (group_id, user_id) to prevent duplicate memberships.
 */
@Entity
@Table(
    name = "group_members",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = {"group_id", "user_id"})
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The travel group this member belongs to
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    private TravelGroup group;

    // The registered user who is participating in the group
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // The permissions assigned to this user (GROUP_OWNER, GROUP_ADMIN, GROUP_MEMBER)
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GroupRole role = GroupRole.GROUP_MEMBER;

    @Column(name = "joined_at", nullable = false, updatable = false)
    private LocalDateTime joinedAt;

    @PrePersist
    protected void onCreate() {
        if (joinedAt == null) {
            joinedAt = LocalDateTime.now();
        }
    }
}
