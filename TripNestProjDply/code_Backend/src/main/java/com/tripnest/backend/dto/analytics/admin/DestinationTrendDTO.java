package com.tripnest.backend.dto.analytics.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DestinationTrendDTO {

    private String destination;
    private Long totalTrips;
    private Long totalTravelers;
    private BigDecimal estimatedSpend;
}
