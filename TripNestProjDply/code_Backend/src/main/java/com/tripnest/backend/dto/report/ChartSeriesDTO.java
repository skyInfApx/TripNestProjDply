package com.tripnest.backend.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChartSeriesDTO {

    private String chartTitle;
    private List<String> labels;
    private List<ChartDatasetDTO> datasets;
}
