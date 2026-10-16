package com.tripnest.backend.dto.split;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Response DTO returned to the traveler or UI representing one individual split share.
 * 
 * Tells the complete human story:
 * - What was the expense? ("Dinner at Shimla Cafe")
 * - Who owes the money? (userId: 2, userName: "Pi")
 * - How much do they owe? (shareAmount: 1000.00)
 * - Who did they owe it to? (paidByUserId: 6, paidByUserName: "Aln")
 * - Is it paid back yet? (isSettled: false)
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseSplitResponse {

    // Unique split record ID
    private Long id;

    // Parent expense details
    private Long expenseId;
    private String expenseDescription;

    // Debtor details (the companion who owes this share)
    private Long userId;
    private String userName;
    private String userEmail;

    // The exact money amount of this share
    private BigDecimal shareAmount;

    // Settlement state: true = paid back; false = active debt
    private Boolean isSettled;
    private LocalDateTime settledAt;

    // Creditor details (the companion who paid the bill and should receive this money)
    private Long paidByUserId;
    private String paidByUserName;
    private String paidByUserEmail;

    // Creation audit timestamp
    private LocalDateTime createdAt;
}
