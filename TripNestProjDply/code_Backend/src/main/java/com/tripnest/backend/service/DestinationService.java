


package com.tripnest.backend.service;

import com.tripnest.backend.dto.destination.DestinationRequestDTO;
import com.tripnest.backend.dto.destination.DestinationResponseDTO;
import com.tripnest.backend.entity.Destination;
import com.tripnest.backend.repository.DestinationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class DestinationService {

    private static final Logger log = LoggerFactory.getLogger(DestinationService.class);

    private final DestinationRepository destinationRepository;

    @Value("${OPENWEATHER_API_KEY:}")
    private String apiKey;

    public DestinationService(DestinationRepository destinationRepository) {
        this.destinationRepository = destinationRepository;
    }

    // Create destination: DTO → Entity → Database → Response DTO.
    public DestinationResponseDTO createDestination(DestinationRequestDTO request) {

        Destination destination = new Destination();

        destination.setName(request.getName());
        destination.setCountry(request.getCountry());
        destination.setDescription(request.getDescription());
        destination.setType(request.getType());
        destination.setBestTimeToVisit(request.getBestTimeToVisit());
        destination.setTravelInformation(request.getTravelInformation());
        destination.setImageUrl(request.getImageUrl());

        Destination savedDestination = destinationRepository.save(destination);

        return convertToResponseDTO(savedDestination);
    }

    // Get all destinations.
    public List<DestinationResponseDTO> getAllDestinations() {

        return destinationRepository.findAll()
                .stream()
                .map(this::convertToResponseDTO)
                .collect(Collectors.toList());
    }

    // Get one destination by ID (with auto-weather caching if missing).
    public Optional<DestinationResponseDTO> getDestinationById(Long id) {

        return destinationRepository.findById(id)
                .map(destination -> {
                    if (destination.getWeather() == null || destination.getWeather().trim().isEmpty()) {
                        String liveWeather = fetchLiveWeather(destination.getName());
                        if (liveWeather != null) {
                            destination.setWeather(liveWeather);
                            destination = destinationRepository.save(destination);
                        }
                    }
                    return convertToResponseDTO(destination);
                });
    }

    // Refresh live weather for a specific destination and cache in DB.
    public DestinationResponseDTO refreshDestinationWeather(Long id) {
        Destination destination = destinationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Destination not found with id: " + id));

        String liveWeather = fetchLiveWeather(destination.getName());
        if (liveWeather != null) {
            destination.setWeather(liveWeather);
            destination = destinationRepository.save(destination);
        }

        return convertToResponseDTO(destination);
    }

    /**
     * Daily Weather Sync Cron Job:
     * Automatically synchronizes live weather for all destinations every morning at 6:00 AM.
     * Cron expression: "0 0 6 * * ?" = Runs at 06:00:00 AM every single day.
     * Can also be called on-demand via the admin/sync endpoint.
     *
     * @return count of successfully updated destinations
     */
    @Scheduled(cron = "0 0 6 * * ?")
    public int syncAllDestinationsWeather() {
        log.info(">>> [CRON] Starting weather synchronization for all destinations...");
        List<Destination> destinations = destinationRepository.findAll();
        int updatedCount = 0;

        for (Destination destination : destinations) {
            try {
                String liveWeather = fetchLiveWeather(destination.getName());
                if (liveWeather != null && !liveWeather.trim().isEmpty()) {
                    destination.setWeather(liveWeather);
                    updatedCount++;
                }
            } catch (Exception ex) {
                log.warn("Could not sync weather for {}: {}", destination.getName(), ex.getMessage());
            }
        }

        destinationRepository.saveAll(destinations);
        log.info(">>> [CRON] Completed weather sync: successfully updated {} / {} destinations.", updatedCount, destinations.size());
        return updatedCount;
    }

    // City alias mapping for tourist reserves/districts to nearest OpenWeatherMap meteorological station
    private static final Map<String, String> CITY_ALIASES = Map.ofEntries(
            Map.entry("bangalore", "Bengaluru"),
            Map.entry("bluru", "Bengaluru"),
            Map.entry("coorg", "Madikeri"),
            Map.entry("havelock island", "Port Blair"),
            Map.entry("kaziranga", "Golaghat"),
            Map.entry("sundarbans", "Canning"),
            Map.entry("wayanad", "Kalpetta"),
            Map.entry("spiti valley", "Kaza"),
            Map.entry("jim corbett", "Ramnagar"),
            Map.entry("ranthambore", "Sawai Madhopur"),
            Map.entry("alibaug", "Alibag"),
            Map.entry("gir national park", "Junagadh")
    );

    // Call OpenWeatherMap REST API with API key from application.properties
    public String fetchLiveWeather(String cityName) {
        if (apiKey == null || apiKey.trim().isEmpty() || cityName == null || cityName.trim().isEmpty()) {
            return null;
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            // Handle city names with dashes or spaces (e.g. "bluru - urbn" -> "Bengaluru" or "bluru")
            String cleanCity = cityName.split("-")[0].trim();
            String lookupKey = cleanCity.toLowerCase();
            if (CITY_ALIASES.containsKey(lookupKey)) {
                cleanCity = CITY_ALIASES.get(lookupKey);
            }

            String url = "https://api.openweathermap.org/data/2.5/weather?q="
                    + cleanCity
                    + "&appid=" + apiKey.trim()
                    + "&units=metric";

            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && response.containsKey("main")) {
                Map<String, Object> main = (Map<String, Object>) response.get("main");
                List<Map<String, Object>> weatherList = (List<Map<String, Object>>) response.get("weather");

                Number tempNum = (Number) main.get("temp");
                long temp = Math.round(tempNum.doubleValue());

                String condition = "";
                if (weatherList != null && !weatherList.isEmpty()) {
                    condition = (String) weatherList.get(0).get("main");
                }

                return temp + "°C · " + condition;
            }
        } catch (Exception e) {
            return null;
        }

        return null;
    }

    // Update an existing destination.
    public DestinationResponseDTO updateDestination(
            Long id,
            DestinationRequestDTO request) {

        Destination existing = destinationRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Destination not found"));

        existing.setName(request.getName());
        existing.setCountry(request.getCountry());
        existing.setDescription(request.getDescription());
        existing.setType(request.getType());
        existing.setBestTimeToVisit(request.getBestTimeToVisit());
        existing.setTravelInformation(request.getTravelInformation());
        existing.setImageUrl(request.getImageUrl());

        Destination updatedDestination =
                destinationRepository.save(existing);

        return convertToResponseDTO(updatedDestination);
    }

    // Delete a destination by ID.
    public void deleteDestination(Long id) {

        destinationRepository.deleteById(id);
    }

    // Converts Entity into the DTO returned to the client.
    private DestinationResponseDTO convertToResponseDTO(
            Destination destination) {

        return new DestinationResponseDTO(
                destination.getId(),
                destination.getName(),
                destination.getCountry(),
                destination.getDescription(),
                destination.getType(),
                destination.getBestTimeToVisit(),
                destination.getTravelInformation(),
                destination.getImageUrl(),
                destination.getWeather()
        );
    }
}









// --------------------------------

// package com.tripnest.backend.service;

// import com.tripnest.backend.entity.Destination;
// import com.tripnest.backend.repository.DestinationRepository;
// import org.springframework.stereotype.Service;

// import java.util.List;
// import java.util.Optional;

// @Service
// public class DestinationService {

//     private final DestinationRepository destinationRepository;

//     public DestinationService(DestinationRepository destinationRepository) {
//         this.destinationRepository = destinationRepository;
//     }


//         // Saves a new destination in the database.
//     public Destination createDestination(Destination destination) {
//         return destinationRepository.save(destination);
//     }


//         // Gets all destinations from the database.
//     public List<Destination> getAllDestinations() {
//         return destinationRepository.findAll();
//     }



//         // Get one destination using its ID.
//     public Optional<Destination> getDestinationById(Long id) {
//         return destinationRepository.findById(id);
//     }

//     // Update an existing destination.
//     public Destination updateDestination(Long id, Destination destination) {
//         Destination existing = destinationRepository.findById(id)
//                 .orElseThrow(() -> new RuntimeException("Destination not found"));

//         existing.setName(destination.getName());
//         existing.setCountry(destination.getCountry());
//         existing.setDescription(destination.getDescription());
//         existing.setType(destination.getType());
//         existing.setBestTimeToVisit(destination.getBestTimeToVisit());
//         existing.setTravelInformation(destination.getTravelInformation());

//         return destinationRepository.save(existing);
//     }

//     // Delete a destination using its ID.
//     public void deleteDestination(Long id) {
//         destinationRepository.deleteById(id);
//     }


// }