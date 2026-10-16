
package com.tripnest.backend.service;

import com.tripnest.backend.entity.GroupMember;
import com.tripnest.backend.entity.TravelGroup;
import com.tripnest.backend.entity.Trip;
import com.tripnest.backend.repository.GroupMemberRepository;
import com.tripnest.backend.repository.TravelGroupRepository;
import com.tripnest.backend.repository.TripRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class TripService {

    private final TripRepository tripRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final TravelGroupRepository travelGroupRepository;

    public TripService(
            TripRepository tripRepository,
            GroupMemberRepository groupMemberRepository,
            TravelGroupRepository travelGroupRepository) {
        this.tripRepository = tripRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.travelGroupRepository = travelGroupRepository;
    }

    // Create or update a trip
    public Trip saveTrip(Trip trip) {
        return tripRepository.save(trip);
    }

    // Get all trips
    public List<Trip> getAllTrips() {
        return tripRepository.findAll();
    }

    // Get a trip by ID
    public Optional<Trip> getTripById(Long tripId) {
        return tripRepository.findById(tripId);
    }

    // Get trips belonging to a particular user (owned only)
    public List<Trip> getTripsByOwner(Long ownerId) {
        return tripRepository.findByOwnerId(ownerId);
    }

    // Get all trips accessible by a user (both trips they own AND trips they joined as squad members)
    public List<Trip> getTripsForUser(Long userId) {
        List<Trip> ownedTrips = tripRepository.findByOwnerId(userId);
        List<GroupMember> memberships = groupMemberRepository.findByUserId(userId);

        Set<Long> tripIds = ownedTrips.stream()
                .map(Trip::getId)
                .collect(Collectors.toSet());
        List<Trip> allTrips = new ArrayList<>(ownedTrips);

        for (GroupMember member : memberships) {
            if (member.getGroup() != null && member.getGroup().getTrip() != null) {
                Trip joinedTrip = member.getGroup().getTrip();
                if (!tripIds.contains(joinedTrip.getId())) {
                    tripIds.add(joinedTrip.getId());
                    allTrips.add(joinedTrip);
                }
            }
        }
        return allTrips;
    }

    // Check whether a trip belongs to a particular user
    public boolean isTripOwnedByUser(Long tripId, Long ownerId) {

        Optional<Trip> tripOptional = tripRepository.findById(tripId);

        if (tripOptional.isEmpty()) {
            return false;
        }

        Trip trip = tripOptional.get();

        return trip.getOwner().getId().equals(ownerId);
    }

    // Check whether a user is either the trip owner OR an invited squad member
    public boolean isTripAccessibleByUser(Long tripId, Long userId) {
        Optional<Trip> tripOptional = tripRepository.findById(tripId);
        if (tripOptional.isEmpty()) {
            return false;
        }
        Trip trip = tripOptional.get();
        if (trip.getOwner().getId().equals(userId)) {
            return true;
        }
        Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(tripId);
        if (groupOpt.isPresent()) {
            return groupMemberRepository.existsByGroupIdAndUserId(groupOpt.get().getId(), userId);
        }
        return false;
    }


    public Trip updateTrip(Long tripId, Trip updatedTrip) {

        Trip existingTrip = tripRepository.findById(tripId)
                .orElseThrow(() -> new RuntimeException("Trip not found"));

        existingTrip.setTitle(updatedTrip.getTitle());
        existingTrip.setDestination(updatedTrip.getDestination());
        existingTrip.setStartDate(updatedTrip.getStartDate());
        existingTrip.setEndDate(updatedTrip.getEndDate());
        existingTrip.setNumberOfTravelers(updatedTrip.getNumberOfTravelers());
        existingTrip.setStatus(updatedTrip.getStatus());

        return tripRepository.save(existingTrip);
    }



    // Compute effective traveler count (max of declared travelers and enrolled group members)
    public int getEffectiveTravelerCount(Trip trip) {
        if (trip == null) return 1;
        int baseCount = trip.getNumberOfTravelers() != null ? trip.getNumberOfTravelers() : 1;
        if (trip.getId() == null) return Math.max(baseCount, 1);
        Optional<TravelGroup> groupOpt = travelGroupRepository.findByTripId(trip.getId());
        if (groupOpt.isPresent()) {
            long memberCount = groupMemberRepository.countByGroupId(groupOpt.get().getId());
            return (int) Math.max(baseCount, memberCount);
        }
        return Math.max(baseCount, 1);
    }

    // Delete a trip
    public void deleteTrip(Long tripId) {
        tripRepository.deleteById(tripId);
    }
}





// V1 --------------------------------------------------
// package com.tripnest.backend.service;

// import com.tripnest.backend.entity.Trip;
// import com.tripnest.backend.repository.TripRepository;
// import org.springframework.stereotype.Service;

// import java.util.List;
// import java.util.Optional;

// @Service
// public class TripService {

//     private final TripRepository tripRepository;

//     public TripService(TripRepository tripRepository) {
//         this.tripRepository = tripRepository;
//     }

//     // Create or update a trip
//     public Trip saveTrip(Trip trip) {
//         return tripRepository.save(trip);
//     }

//     // Get all trips
//     public List<Trip> getAllTrips() {
//         return tripRepository.findAll();
//     }

//     // Get a trip by ID
//     public Optional<Trip> getTripById(Long tripId) {
//         return tripRepository.findById(tripId);
//     }

//     // Get trips belonging to a particular user
//     public List<Trip> getTripsByOwner(Long ownerId) {
//         return tripRepository.findByOwnerId(ownerId);
//     }

//     // Delete a trip
//     public void deleteTrip(Long tripId) {
//         tripRepository.deleteById(tripId);
//     }
// }

