package com.tripnest.backend.dto.expense;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.tripnest.backend.entity.ExpenseCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * ExpenseRequestDTO captures client input for recording or editing an expense.
 * Validates inputs at the HTTP boundary before database processing.
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class ExpenseRequestDTO {

    // Title or memo for the expense
    @NotBlank(message = "Expense description is required")
    @Size(max = 255, message = "Description cannot exceed 255 characters")
    private String description;

    // Monetary amount paid (must be strictly greater than 0)
    @NotNull(message = "Expense amount is required")
    @Positive(message = "Expense amount must be strictly greater than zero")
    private BigDecimal amount;

    // Optional currency code (defaults to 'INR' in service if omitted)
    private String currency;

    // Standard spending category: ACCOMMODATION, TRANSPORTATION, FOOD, ACTIVITIES, SHOPPING, MISCELLANEOUS
    @NotNull(message = "Category is required")
    private ExpenseCategory category;

    // Date the expense physically occurred (bill date, e.g. 2026-09-20)
    @NotNull(message = "Expense date is required")
    private LocalDate expenseDate;

    // Optional date the expense was logged/entered into the system (defaults to today if null)
    private LocalDate entryDate;

    // Optional: ID of the member who paid. If null, service automatically assigns the logged-in user.
    private Long paidByUserId;
}
