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
public class ChartDatasetDTO {

    private String label;
    private List<Double> data;
    private List<String> backgroundColor;
    private List<String> borderColor;
}
