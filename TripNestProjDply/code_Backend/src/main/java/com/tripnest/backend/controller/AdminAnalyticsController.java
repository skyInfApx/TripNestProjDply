package com.tripnest.backend.controller;

import com.tripnest.backend.dto.analytics.admin.*;
import com.tripnest.backend.service.AdminAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * AdminAnalyticsController exposes REST APIs for system administrators:
 * platform macro telemetry, user demographics, trip status distributions,
 * destination popularity rankings, and financial volumes.
 * 
 * Base Path: /api/admin/analytics
 */
@RestController
@RequestMapping("/api/admin/analytics")
@CrossOrigin
@RequiredArgsConstructor
@Slf4j
public class AdminAnalyticsController {

    private final AdminAnalyticsService adminAnalyticsService;

    /**
     * Master Endpoint: Bundles all admin telemetry widgets in a single high-performance payload.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<AdminDashboardDTO> getAdminDashboard(Authentication authentication) {
        verifyAdminAccess(authentication);
        return ResponseEntity.ok(adminAnalyticsService.getAdminDashboard());
    }

    /**
     * Top-line platform overview KPIs (Total users, trips, spends, budgets, averages).
     */
    @GetMapping("/overview")
    public ResponseEntity<AdminOverviewDTO> getOverview(Authentication authentication) {
        verifyAdminAccess(authentication);
        return ResponseEntity.ok(adminAnalyticsService.getOverview());
    }

    /**
     * User demographics, active traveler counts, and power travelers.
     */
    @GetMapping("/users")
    public ResponseEntity<AdminUserAnalyticsDTO> getUserAnalytics(Authentication authentication) {
        verifyAdminAccess(authentication);
        return ResponseEntity.ok(adminAnalyticsService.getUserAnalytics());
    }

    /**
     * Platform trip analytics (status distributions, average duration, monthly creation velocity).
     */
    @GetMapping("/trips")
    public ResponseEntity<AdminTripAnalyticsDTO> getTripAnalytics(Authentication authentication) {
        verifyAdminAccess(authentication);
        return ResponseEntity.ok(adminAnalyticsService.getTripAnalytics());
    }

    /**
     * Destination popularity trends and unique destination counts platform-wide.
     */
    @GetMapping("/destinations")
    public ResponseEntity<AdminDestinationAnalyticsDTO> getDestinationAnalytics(Authentication authentication) {
        verifyAdminAccess(authentication);
        return ResponseEntity.ok(adminAnalyticsService.getDestinationAnalytics());
    }

    /**
     * Platform-wide financial volume, average spend, category shares, and monthly trends.
     */
    @GetMapping("/financials")
    public ResponseEntity<AdminFinancialAnalyticsDTO> getFinancialAnalytics(Authentication authentication) {
        verifyAdminAccess(authentication);
        return ResponseEntity.ok(adminAnalyticsService.getFinancialAnalytics());
    }

    /**
     * Promotes an existing user to Administrator role (Admin-only privilege).
     */
    @PostMapping("/users/{userId}/promote")
    public ResponseEntity<String> promoteUserToAdmin(@PathVariable Long userId, Authentication authentication) {
        verifyAdminAccess(authentication);
        return ResponseEntity.ok(adminAnalyticsService.promoteUserToAdmin(userId));
    }

    // =========================================================================
    // AUTHORIZATION GUARD
    // =========================================================================

    private void verifyAdminAccess(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new AccessDeniedException("Authentication required to access admin analytics");
        }

        String email = authentication.getName();
        boolean isAdmin = adminAnalyticsService.isUserAdmin(email);
        if (!isAdmin) {
            log.warn("Access Denied: User {} attempted to access admin analytics without ADMIN role", email);
            throw new AccessDeniedException("Access Denied: User " + email + " does not possess ADMIN privileges");
        }
    }
}
