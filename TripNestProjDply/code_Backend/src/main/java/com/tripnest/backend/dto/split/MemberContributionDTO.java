package com.tripnest.backend.dto.split;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Data Transfer Object representing an individual group member's overall financial summary for a trip.
 * 
 * Tells each companion's complete trip story:
 * - Who is this traveler? (userId, userName, userEmail)
 * - How much cash did they pay out-of-pocket for everyone? (totalPaid)
 * - What was their fair share of the expenses? (fairShare)
 * - What is their net position? (netBalance = totalPaid - fairShare)
 * - What is their final financial status? (status: "RECEIVES", "OWES", or "SETTLED")
 * 
 * Example:
 * Aln: totalPaid = ₹3000, fairShare = ₹1400 -> netBalance = +₹1600 (status = "RECEIVES")
 * Pi:  totalPaid = ₹1200, fairShare = ₹1400 -> netBalance = -₹200  (status = "OWES")
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberContributionDTO {

    // Traveler identification
    private Long userId;
    private String userName;
    private String userEmail;

    // Total money paid upfront by this traveler for group bills
    private BigDecimal totalPaid;

    // Total portion of group expenses this traveler is responsible for
    private BigDecimal fairShare;

    // Net balance = totalPaid - fairShare (positive = to receive, negative = to pay)
    private BigDecimal netBalance;

    // Human-friendly status: "RECEIVES", "OWES", or "SETTLED"
    private String status;
}
