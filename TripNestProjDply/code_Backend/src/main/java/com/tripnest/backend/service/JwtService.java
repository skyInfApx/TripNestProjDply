package com.tripnest.backend.service;

import java.time.Instant;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    @Value("${jwt.secret}")
    private String secret;

    private final JwtEncoder jwtEncoder;

    public JwtService(JwtEncoder jwtEncoder) {
        this.jwtEncoder = jwtEncoder;
    }

    public String generateToken(String email, List<String> roles) {
        Instant now = Instant.now();

        String primaryRole = (roles != null && !roles.isEmpty()) ? roles.get(0) : "TRAVELER";
        if (roles != null && roles.contains("ADMIN")) {
            primaryRole = "ADMIN";
        }

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(email)
                .claim("roles", roles != null ? roles : List.of("TRAVELER"))
                .claim("role", primaryRole)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(86400))
                .build();

        return jwtEncoder.encode(
                JwtEncoderParameters.from(
                        claims
                )
        ).getTokenValue();
    }

    // Default overloaded method for callers without explicit roles
    public String generateToken(String email) {
        return generateToken(email, List.of("TRAVELER"));
    }
}