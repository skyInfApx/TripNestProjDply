package com.tripnest.backend.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TravelStatsDTO {

    private Long totalTrips;
    private Long completedTrips;
    private Long ongoingTrips;
    private Long plannedTrips;
    private Long uniqueDestinationsCount;
}
