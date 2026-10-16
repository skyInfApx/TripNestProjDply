package com.tripnest.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * ExpenseSplit Entity represents an individual traveler's assigned monetary share
 * for a shared group expense.
 * 
 * Real-world Scenario:
 * If Aln pays ₹3,000 for a group dinner with Pi and Kim, three ExpenseSplit rows are created:
 * 1. Aln: ₹1,000 (Already paid by himself, auto-settled)
 * 2. Pi:  ₹1,000 (Unsettled debt owed to Aln)
 * 3. Kim: ₹1,000 (Unsettled debt owed to Aln)
 * 
 * Relationships:
 * - Many-to-One with Expense: A bill can be split across multiple group companions.
 * - Many-to-One with User: Identifies the companion who owes this specific share.
 */
@Entity
@Table(
    name = "expense_splits",
    indexes = {
        @Index(name = "idx_expense_splits_expense_id", columnList = "expense_id"),
        @Index(name = "idx_expense_splits_user_id", columnList = "user_id"),
        @Index(name = "idx_expense_splits_settled", columnList = "is_settled")
    }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseSplit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The parent expense/receipt being divided
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    // The traveler who is responsible for this share of the cost
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // Exact financial share amount (precision 12, scale 2 guarantees paisa/cent accuracy)
    @Column(name = "share_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal shareAmount;

    // Settlement state: false = debt is active; true = paid back to the payer
    @Column(name = "is_settled", nullable = false)
    @Builder.Default
    private Boolean isSettled = false;

    // Timestamp when this debt was settled
    @Column(name = "settled_at")
    private LocalDateTime settledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.isSettled == null) {
            this.isSettled = false;
        }
    }
}
