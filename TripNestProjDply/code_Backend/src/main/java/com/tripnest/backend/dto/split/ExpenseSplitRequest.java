package com.tripnest.backend.dto.split;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/**
 * Request payload sent by a traveler to split an expense among companions.
 * 
 * Supports two split styles:
 * 1. EQUAL: Automatically divides the bill evenly among userIds.
 *    Example: Total ₹3,000 divided by 3 friends = ₹1,000 each.
 * 2. CUSTOM: Each friend is assigned a specific custom amount from customShares.
 *    Example: Aln = ₹1,500, Pi = ₹1,000, Kim = ₹500.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseSplitRequest {

    /**
     * Split Type: "EQUAL" or "CUSTOM". Defaults to "EQUAL".
     */
    @Builder.Default
    private String splitType = "EQUAL";

    /**
     * List of user IDs who share the bill in an EQUAL split.
     * Example: [6, 2, 7]
     */
    private List<Long> userIds;

    /**
     * List of custom share amounts when splitType is "CUSTOM".
     */
    private List<CustomSplitItem> customShares;

    /**
     * Helper item representing one friend's custom share.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomSplitItem {
        private Long userId;
        private BigDecimal amount;
    }
}
