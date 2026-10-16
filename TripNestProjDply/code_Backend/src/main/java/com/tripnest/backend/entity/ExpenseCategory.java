package com.tripnest.backend.entity;

/**
 * ExpenseCategory defines the standard classifications for trip expenditures in TripNest.
 * 
 * Alignment:
 * 1. Milestone 3 Task 1 Budget limits (accommodation, transportation, food, activities, misc).
 * 2. Team-B Excel Tracker Task 3 specifications:
 *    "Implement expense categories such as Transportation, Hotel, Food, Shopping, Entertainment and Miscellaneous."
 * 3. Milestone 4 Chart.js Reporting & Analytics (provides discrete categories for visual pie and bar charts).
 */
public enum ExpenseCategory {

    ACCOMMODATION,    // Hotels, resorts, homestays, Airbnb (maps to Budget accommodationLimit)
    TRANSPORTATION,   // Flights, trains, car rentals, cabs, fuel, tolls (maps to Budget transportationLimit)
    FOOD,             // Dining, restaurants, groceries, cafes, street food (maps to Budget foodLimit)
    ACTIVITIES,       // Museum tickets, tours, adventure sports, entertainment (maps to Budget activitiesLimit)
    SHOPPING,         // Local markets, gifts, clothes, souvenirs (maps to Budget miscLimit)
    MISCELLANEOUS     // Emergency cash, tips, medical, laundry, phone/SIM (maps to Budget miscLimit)
}
