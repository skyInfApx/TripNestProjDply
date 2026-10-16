package com.tripnest.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Budget Entity represents the financial budget plan linked to a specific Trip.
 * It tracks the overall monetary ceiling and the allocated category targets.
 * 
 * Relationship: 1-to-1 with Trip (A trip has exactly one budget).
 */
@Entity
@Table(name = "budgets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Budget {

    // =========================================================================
    // PRIMARY KEY: Unique database ID for this budget record
    // =========================================================================
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // =========================================================================
    // RELATIONSHIP: Every budget belongs to exactly ONE Trip.
    // 'unique = true' enforces at the database level that a trip cannot have 2 budgets.
    // 'fetch = FetchType.LAZY' avoids loading the whole Trip into memory unless needed.
    // =========================================================================
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false, unique = true)
    private Trip trip;

    // =========================================================================
    // TOTAL BUDGET: Maximum planned expenditure for the vacation.
    // We use BigDecimal for financial precision (never float or double).
    // precision=12, scale=2 means up to 999,999,999.99 (up to 100 Crores with 2 decimals).
    // =========================================================================
    @Column(name = "total_budget", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalBudget;

    // Currency code: Defaults to 'INR' (Indian Rupee), supports USD, EUR, etc.
    @Column(name = "currency", nullable = false, length = 10)
    @Builder.Default
    private String currency = "INR";

    // =========================================================================
    // CATEGORY BUDGET LIMITS (Allocations)
    // =========================================================================

    // Limit allocated for hotels, resorts, homestays
    @Column(name = "accommodation_limit", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal accommodationLimit = BigDecimal.ZERO;

    // Limit allocated for flights, trains, rental cars, cabs
    @Column(name = "transportation_limit", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal transportationLimit = BigDecimal.ZERO;

    // Limit allocated for restaurants, street food, cafes
    @Column(name = "food_limit", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal foodLimit = BigDecimal.ZERO;

    // Limit allocated for museum tickets, sports, guided tours
    @Column(name = "activities_limit", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal activitiesLimit = BigDecimal.ZERO;

    // Limit allocated for souvenirs, apparel, local markets
    @Column(name = "shopping_limit", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal shoppingLimit = BigDecimal.ZERO;

    // Limit allocated for emergency cash, buffer fund, unexpected fees
    @Column(name = "misc_limit", precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal miscLimit = BigDecimal.ZERO;

    // =========================================================================
    // AUDIT TIMESTAMPS: Automatically tracks creation and update time
    // =========================================================================
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Lifecycle hook: runs right before JPA inserts this row into PostgreSQL
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        ensureNonNullLimits();
    }

    // Lifecycle hook: runs right before JPA updates this existing row in PostgreSQL
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        ensureNonNullLimits();
    }

    /**
     * Helper method to compute the sum of all 5 category limits.
     * Used by the service layer to check: (getTotalAllocated() <= totalBudget).
     */
    public BigDecimal getTotalAllocated() {
        ensureNonNullLimits();
        return accommodationLimit
                .add(transportationLimit)
                .add(foodLimit)
                .add(activitiesLimit)
                .add(shoppingLimit)
                .add(miscLimit);
    }

    /**
     * Helper method to prevent NullPointerExceptions by converting nulls to ZERO.
     */
    private void ensureNonNullLimits() {
        if (this.accommodationLimit == null) this.accommodationLimit = BigDecimal.ZERO;
        if (this.transportationLimit == null) this.transportationLimit = BigDecimal.ZERO;
        if (this.foodLimit == null) this.foodLimit = BigDecimal.ZERO;
        if (this.activitiesLimit == null) this.activitiesLimit = BigDecimal.ZERO;
        if (this.shoppingLimit == null) this.shoppingLimit = BigDecimal.ZERO;
        if (this.miscLimit == null) this.miscLimit = BigDecimal.ZERO;
        if (this.totalBudget == null) this.totalBudget = BigDecimal.ZERO;
        if (this.currency == null) this.currency = "INR";
    }
}
