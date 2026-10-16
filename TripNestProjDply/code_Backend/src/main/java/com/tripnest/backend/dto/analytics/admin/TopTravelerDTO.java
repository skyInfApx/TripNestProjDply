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
public class TopTravelerDTO {

    private Long userId;
    private String name;
    private String email;
    private Long tripCount;
    private BigDecimal totalSpent;
    private boolean admin;
}
