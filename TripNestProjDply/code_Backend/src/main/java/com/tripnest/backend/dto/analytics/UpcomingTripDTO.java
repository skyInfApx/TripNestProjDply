package com.tripnest.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpcomingTripDTO {

    private Long tripId;
    private String title;
    private String destination;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long daysUntilTrip;
    private String status;
    private Integer numberOfTravelers;
}
