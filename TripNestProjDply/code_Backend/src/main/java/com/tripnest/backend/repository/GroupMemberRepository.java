package com.tripnest.backend.repository;

import com.tripnest.backend.entity.GroupMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * GroupMemberRepository provides database operations for the GroupMember entity.
 */
@Repository
public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

    /**
     * GOAL: Fetch the complete member roster for a travel group.
     * SQL:  SELECT * FROM group_members WHERE group_id = ?
     */
    List<GroupMember> findByGroupId(Long groupId);

    /**
     * GOAL: Count total enrolled members in a travel group.
     * SQL:  SELECT COUNT(*) FROM group_members WHERE group_id = ?
     */
    long countByGroupId(Long groupId);

    /**
     * GOAL: Check if a user is already in this group to prevent duplicate joins.
     * SQL:  SELECT COUNT(*) > 0 FROM group_members WHERE group_id = ? AND user_id = ?
     */
    boolean existsByGroupIdAndUserId(Long groupId, Long userId);

    /**
     * GOAL: Retrieve a specific user's membership and permissions (role) in this group.
     * SQL:  SELECT * FROM group_members WHERE group_id = ? AND user_id = ?
     */
    Optional<GroupMember> findByGroupIdAndUserId(Long groupId, Long userId);

    /**
     * GOAL: Find all travel groups that a specific user has joined.
     * SQL:  SELECT * FROM group_members WHERE user_id = ?
     */
    List<GroupMember> findByUserId(Long userId);
}
