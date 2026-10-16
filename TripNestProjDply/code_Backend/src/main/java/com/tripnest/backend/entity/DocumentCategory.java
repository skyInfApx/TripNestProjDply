package com.tripnest.backend.entity;

/**
 * DocumentCategory classifies travel-related files and media uploaded to TripNest.
 * 
 * Used for:
 * 1. Categorizing files inside the Trip Document Vault (UI tabs & filters).
 * 2. Organizing flight/train passes, hotel vouchers, expense receipts, and trip photos.
 */
public enum DocumentCategory {
    TICKET,    // Flight boarding passes, train PNR tickets, bus tickets, safari passes
    BOOKING,   // Hotel confirmation vouchers, Airbnb receipts, rental car agreements
    RECEIPT,   // Restaurant bills, shopping slips, activity payment receipts
    PHOTO,     // Vacation photos, memories, group snapshots
    OTHER      // Visas, travel insurance policies, identity proofs, emergency contacts
}
