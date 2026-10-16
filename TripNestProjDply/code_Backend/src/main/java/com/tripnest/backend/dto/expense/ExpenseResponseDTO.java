package com.tripnest.backend.dto.expense;

import com.tripnest.backend.entity.ExpenseCategory;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * ExpenseResponseDTO returns formatted expense details to the client.
 * Enriched with human-readable trip and payer metadata for easy UI rendering.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponseDTO {

    private Long id;

    // Trip reference
    private Long tripId;
    private String tripTitle; // e.g. "hill station tour sept"

    // Transaction details
    private String description;
    private BigDecimal amount;
    private String currency;
    private ExpenseCategory category;
    private LocalDate expenseDate;
    private LocalDate entryDate;

    // Payer information (Who paid this bill?)
    private Long paidByUserId;
    private String paidByName;   // e.g. "Alan"
    private String paidByEmail;  // e.g. "aln@example.com"

    // Audit timestamps
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
