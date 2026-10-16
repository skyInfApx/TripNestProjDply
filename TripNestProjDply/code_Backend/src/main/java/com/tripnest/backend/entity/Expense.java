package com.tripnest.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Expense Entity represents an individual financial bill, receipt, or transaction during a trip.
 * 
 * Relationships:
 * 1. Many-to-One with Trip: A trip can accumulate multiple expense entries.
 * 2. Many-to-One with User (paidBy): Identifies which group member paid the bill.
 *    (Serves as the foundation for Task 5 Shared Expenses & Split Settlements).
 */
@Entity
@Table(
    name = "expenses",
    indexes = {
        @Index(name = "idx_expenses_trip_id", columnList = "trip_id"),
        @Index(name = "idx_expenses_paid_by", columnList = "paid_by_user_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Expense {

    // =========================================================================
    // 1. PRIMARY KEY
    // =========================================================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // 2. TRANSACTION DETAILS
    // =========================================================================
    
    // Short title / memo describing the expenditure (e.g. "Dinner at Royal Cafe", "Uber to airport")
    @Column(nullable = false, length = 255)
    private String description;

    // Financial amount paid (precision 12, scale 2 guarantees exact cent/paisa accuracy)
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    // Currency code (defaults to 'INR', supports international currencies)
    @Column(nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    // Date the expense physically occurred (bill date)
    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate;

    // Date the expense record was entered/logged
    @Column(name = "entry_date")
    private LocalDate entryDate;

    // =========================================================================
    // 3. CATEGORY CLASSIFICATION
    // =========================================================================
    // Stored as clear uppercase string (e.g. 'FOOD', 'TRANSPORTATION') in PostgreSQL
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ExpenseCategory category;

    // =========================================================================
    // 4. RELATIONSHIP: TRIP PARENT
    // =========================================================================
    // Many expenses belong to ONE trip. FetchType.LAZY optimizes memory footprint.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false)
    private Trip trip;

    // =========================================================================
    // 5. RELATIONSHIP: PAYER (WHO SPENT THE MONEY?)
    // =========================================================================
    // Tracks who paid this bill. Essential for Task 5 debtor-creditor split algorithms.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_by_user_id", nullable = false)
    private User paidBy;

    // =========================================================================
    // 6. AUDIT TIMESTAMPS
    // =========================================================================
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Automatic date-stamp hook right before INSERT into database
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.entryDate == null) {
            this.entryDate = LocalDate.now();
        }
        if (this.currency == null || this.currency.trim().isEmpty()) {
            this.currency = "INR";
        }
    }

    // Automatic date-stamp hook right before UPDATE of existing record
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
