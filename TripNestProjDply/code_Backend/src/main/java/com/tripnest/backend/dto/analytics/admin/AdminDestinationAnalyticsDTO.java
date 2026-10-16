package com.tripnest.backend.dto.analytics.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDestinationAnalyticsDTO {

    private Long totalUniqueDestinations;
    private List<DestinationTrendDTO> topDestinations;
}
