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
public class FavoriteDestinationDTO {

    private String destination;
    private Long visitCount;
    private LocalDate lastVisitedDate;
}
