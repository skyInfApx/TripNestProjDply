package com.tripnest.backend.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * TravelGroup represents a collaborative group formed around a specific Trip.
 * Friends and co-travelers join this group to view the shared itinerary,
 * split expenses, and coordinate activities.
 *
 * Relationship: 1-to-1 with Trip (A trip has at most one travel group).
 */
@Entity
@Table(name = "travel_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TravelGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The trip associated with this collaboration group
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "trip_id", nullable = false, unique = true)
    private Trip trip;

    // Group name (e.g. "Goa Roadtrippers", "Family Manali Tour")
    @Column(nullable = false)
    private String name;

    // Unique short invite code (e.g. "GOA-4821") that companions enter to join the trip
    @Column(name = "join_code", nullable = false, unique = true, length = 12)
    private String joinCode;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
