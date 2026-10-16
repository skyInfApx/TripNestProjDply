package com.tripnest.backend.dto.analytics.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardDTO {

    private AdminOverviewDTO overview;
    private AdminUserAnalyticsDTO userAnalytics;
    private AdminTripAnalyticsDTO tripAnalytics;
    private AdminDestinationAnalyticsDTO destinationAnalytics;
    private AdminFinancialAnalyticsDTO financialAnalytics;
}
