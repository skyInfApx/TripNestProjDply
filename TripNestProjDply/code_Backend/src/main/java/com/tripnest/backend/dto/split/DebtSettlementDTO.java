package com.tripnest.backend.dto.split;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Data Transfer Object representing an optimized settlement transaction between two companions.
 * Produced by the Greedy Debt Minimization Algorithm.
 * 
 * Tells the direct settlement story:
 * - Who pays? (fromUserId, fromUserName)
 * - Who gets paid? (toUserId, toUserName)
 * - How much? (amount)
 * 
 * Example: "Pi pays Aln ₹500.00"
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DebtSettlementDTO {

    // The person who owes money (Debtor)
    private Long fromUserId;
    private String fromUserName;

    // The person who is owed money (Creditor)
    private Long toUserId;
    private String toUserName;

    // The exact calculated amount to transfer
    private BigDecimal amount;
}
