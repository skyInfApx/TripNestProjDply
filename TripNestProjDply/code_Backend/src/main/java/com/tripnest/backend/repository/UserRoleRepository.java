package com.tripnest.backend.repository;

import com.tripnest.backend.entity.UserRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, Long> {

    boolean existsByUserIdAndRoleName(Long userId, String roleName);

    @Query("SELECT ur.role.name FROM UserRole ur WHERE ur.user.id = :userId")
    List<String> findRoleNamesByUserId(@Param("userId") Long userId);
}