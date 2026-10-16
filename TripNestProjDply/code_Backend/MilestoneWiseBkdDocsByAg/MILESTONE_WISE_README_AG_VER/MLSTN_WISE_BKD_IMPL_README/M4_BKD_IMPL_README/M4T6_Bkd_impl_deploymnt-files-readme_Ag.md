# M4T6: Complete Full-Stack Deployment Guide & Production Code Reference
**TripNest Travel Intelligence & Group Coordination Platform**  
*Document Version: 1.0.0 (Production Verified)*  
*Target Stack: Backend on Render (Docker) • Database on Supabase (PostgreSQL) • Frontend on Vercel (React + Vite)*

---

# PART 1: MASTER STEP-BY-STEP DEPLOYMENT GUIDE

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   SUPABASE      │       │     RENDER      │       │     VERCEL      │
│  PostgreSQL DB  │ <──── │ Spring Boot API │ <──── │   React + Vite  │
│(Session Pooler) │       │ (Docker Runtime)│       │  (Global Edge)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
```

---

## 🧭 Pre-Flight Architectural Fundamentals

1. **Why Render Requires a `Dockerfile` for Spring Boot:**
   * Render strictly provides native runtimes for Node.js, Python, Ruby, Go, Rust, and PHP. It does **not** have a native Java runtime.
   * Platforms like Heroku or Railway use Cloud Native Buildpacks to detect and build Maven projects natively. On Render, providing a multi-stage `Dockerfile` is **100% mandatory** to build and run Java 21 Spring Boot applications.
2. **Why Supabase is Recommended over Render PostgreSQL:**
   * Render's free PostgreSQL tier automatically expires and **deletes all data after 30 days**.
   * Supabase provides a permanent free tier (500 MB database, unlimited reads/writes) that does not expire, along with a visual Table Editor to view and manage production data.
3. **Why Supabase Session Pooler (Port 5432) Must Be Used:**
   * Supabase's Direct connection requires **IPv6**. Render's free tier instances only support **IPv4**. Connecting via Direct will fail with a connection timeout.
   * Supabase's Connection Pooler operates over **IPv4**.
   * For Spring Boot with **HikariCP** and **Hibernate** (`@Transactional`), **Session Mode (Port 5432)** is essential because Transaction mode terminates sessions between SQL statements and breaks prepared statements.
4. **Why `vercel.json` is Required on Vercel:**
   * React Router is a Single-Page Application (SPA) with client-side routing.
   * If a user refreshes `/dashboard`, `/trips`, or `/notifications` on Vercel without a rewrite rule, Vercel's edge server attempts to find physical files at those paths and returns a `404: NOT_FOUND`. `vercel.json` rewrites all requests to `/index.html`.

---

## 📋 STEP 1: Provision Managed PostgreSQL on Supabase

1. Go to [supabase.com](https://supabase.com) and sign in with GitHub.
2. Click **New Project**:
   * **Organization:** Select your personal org.
   * **Project Name:** `tripnest-prod`
   * **Database Password:** Enter a strong password and save it in a safe place.
   * **Region:** Select the region closest to your target users (e.g., `Singapore (ap-southeast-1)` or `Mumbai (ap-south-1)`).
3. Once the database is provisioned (~2 minutes):
   * In the bottom-left sidebar, click **Settings (⚙️ Gear Icon)** &rarr; **Database**.
   * Scroll down to **Connection parameters** / **Connection string**.
   * Under **Connection method**, select **Session Pooler** (or **Connection Pooler** with mode **Session**).
   * Select the **JDBC** tab (or URI).
   * Note down:
     * **Port:** `5432`
     * **JDBC URL:** `jdbc:postgresql://aws-0-[region].pooler.supabase.com:5432/postgres?sslmode=require`
     * **Username:** `postgres.[your-project-ref]`
     * **Password:** The database password chosen during project creation.

---

## 📋 STEP 2: Codebase Verification & Configuration

Before pushing to Git, verify that the following files are present:
1. `code_Backend/Dockerfile` (Multi-stage build).
2. `code_Backend/.dockerignore` (Excludes `target/`, `.git/`, `.env`).
3. `code_Backend/src/main/resources/application.properties` (Configured with dynamic `${PORT:8080}` and `${SPRING_DATASOURCE_URL}`).
4. `code_Backend/src/main/java/com/tripnest/backend/config/SecurityConfig.java` (Configured with `setAllowedOriginPatterns` for `*.vercel.app`).
5. `code_Backend/src/main/java/com/tripnest/backend/security/OAuth2LoginSuccessHandler.java` (Configured with dynamic `${FRONTEND_URL}`).
6. `code_FrontEnd/vercel.json` (SPA rewrite rule).
7. `code_FrontEnd/src/services/vaultService.js` and `code_FrontEnd/src/pages/Login.jsx` (Using dynamic `import.meta.env.VITE_API_BASE_URL`).

---

## 📋 STEP 3: Commit and Push Code to GitHub

Open Git Bash in your repository root and push your latest milestone branch:
```bash
git add .
git commit -m "chore: prepare Spring Boot Dockerfile, vercel.json, and production cloud configs"
git push origin <your-active-branch>
```
*(Verify on github.com that your repository displays the newly pushed commit).*

---

## 📋 STEP 4: Deploy Backend Web Service on Render

1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** &rarr; **Web Service**.
3. Under **Connect a repository**, select your GitHub repository: `TripNestProj_with_Antigravity`.
4. Configure the Web Service settings:
   * **Name:** `tripnest-backend`
   * **Region:** Select the same region as your Supabase database (e.g. Singapore or Frankfurt).
   * **Branch:** Select your pushed branch (e.g., `m2-work-done-br` or `main`).
   * **Root Directory:** Set to the relative path of the backend directory containing the `Dockerfile`:
     `TripNestProjVer4M4/code_Backend` *(or your active deployment folder, e.g. `TripNestProjDply/code_Backend`)*.
   * **Runtime:** Select **Docker** 🐳.
   * **Build Command & Start Command:** **LEAVE BLANK** *(Render automatically reads and runs the multi-stage `Dockerfile`)*.
   * **Instance Type:** Free.
5. Under **Environment Variables**, click **Add Environment Variable** and enter the following keys:

| Environment Variable Key | Exact Value to Enter | Source / Description |
|---|---|---|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://<supabase-host>:5432/postgres?sslmode=require` | Supabase Session Pooler JDBC URL |
| `SPRING_DATASOURCE_USERNAME` | `postgres.<your-project-ref>` | Supabase Database Username |
| `SPRING_DATASOURCE_PASSWORD` | `<your-database-password>` | Supabase Database Password |
| `JWT_SECRET` | `404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970` | 256-bit Base64 JWT signing secret |
| `OPENWEATHER_API_KEY` | *(your openweather api key)* | OpenWeather API key |
| `CLOUDINARY_URL` | *(your cloudinary url)* | Cloudinary connection URL |
| `CLOUDINARY_CLOUD_NAME` | *(your cloud name)* | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | *(your api key)* | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | *(your api secret)* | Cloudinary API Secret |
| `FRONTEND_URL` | `https://your-tripnest.vercel.app` *(update after Step 5)* | Vercel production frontend domain |

6. Click **Create Web Service**.
7. Render will build the Docker container and start the application. Watch the build log. Once the Spring Boot banner appears and logs `Started BackendApplication in X.XXX seconds`, your backend is live!
8. Copy your live Render URL:  
   👉 `https://tripnest-backend.onrender.com`
9. **Quick API Test:** Open `https://tripnest-backend.onrender.com/api/destinations` in your browser. If it returns a JSON array, the backend and Supabase database connection are fully functional!

---

## 📋 STEP 5: Deploy Frontend Single-Page App on Vercel

1. Log in to [vercel.com](https://vercel.com) with GitHub.
2. Click **Add New…** &rarr; **Project**.
3. Select your GitHub repository: `TripNestProj_with_Antigravity`.
4. In the Project Configuration screen:
   * **Project Name:** `tripnest` (or `tripnest-app`).
   * **Framework Preset:** `Vite` *(auto-detected)*.
   * **Root Directory:** Click **Edit**, select the frontend directory (e.g., `TripNestProjVer4M4/code_FrontEnd` or `TripNestProjDply/code_FrontEnd`), and click **Continue**.
   * **Build Command:** `npm run build` *(default)*.
   * **Output Directory:** `dist` *(default)*.
5. Expand **Environment Variables**:
   * **Key:** `VITE_API_BASE_URL`
   * **Value:** `https://tripnest-backend.onrender.com` *(your live Render backend URL from Step 4, without trailing slash)*.
6. Click **Deploy**.
7. In ~30 to 45 seconds, Vercel will complete the build and present your live production domain:  
   👉 `https://tripnest.vercel.app`

---

## 📋 STEP 6: Final Verification & Smoke Test Checklist

1. **Authentication Flow:**
   * Open `https://tripnest.vercel.app/register` and create a new traveler account.
   * Log in at `https://tripnest.vercel.app/login` and verify that the JWT token is saved and redirects to `/dashboard`.
2. **SPA Refresh Verification:**
   * Navigate to `/dashboard`, `/trips`, and `/notifications`.
   * Press `F5` / Refresh on each page. Verify that the page reloads cleanly without showing `404 Not Found` (confirming `vercel.json` rewrites are working).
3. **Database Verification on Supabase:**
   * Open Supabase Dashboard &rarr; **Table Editor**.
   * Verify that the `users` table contains your newly registered account, confirming that Spring Boot's `hibernate.ddl-auto=update` successfully initialized all schema tables.
4. **Cross-Origin Resource Sharing (CORS):**
   * Open Browser DevTools (`F12`) &rarr; **Network** tab.
   * Verify that all requests to `https://tripnest-backend.onrender.com/api/...` succeed with HTTP status `200` or `201` with zero CORS error blocks.

---

# PART 2: COMPLETE SOURCE CODE OF ALL DEPLOYMENT FILES

---

### File 1: `code_Backend/Dockerfile`
**Path:** `code_Backend/Dockerfile`  
**Purpose:** Multi-stage production container build for Spring Boot 4 / Java 21 on Render.

```dockerfile
# ==============================================================================
# STAGE 1: Build the Spring Boot JAR using Maven & Eclipse Temurin JDK 21
# ==============================================================================
FROM maven:3.9.6-eclipse-temurin-21-alpine AS builder
WORKDIR /app

# 1. Cache Maven dependencies by copying pom.xml first
COPY pom.xml .
RUN mvn dependency:go-offline -B

# 2. Copy source code and package application into runnable JAR (skipping unit tests for deploy)
COPY src ./src
RUN mvn clean package -DskipTests

# ==============================================================================
# STAGE 2: Lightweight, Secure Production Runtime (Temurin JRE 21 Alpine)
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Copy the packaged JAR from the builder stage
COPY --from=builder /app/target/*.jar app.jar

# Expose default HTTP port
EXPOSE 8080

# Dynamically bind to Render's dynamic $PORT environment variable (defaults to 8080 locally)
ENTRYPOINT ["sh", "-c", "java -Dserver.port=${PORT:-8080} -jar app.jar"]
```

---

### File 2: `code_Backend/.dockerignore`
**Path:** `code_Backend/.dockerignore`  
**Purpose:** Prevents local build artifacts and sensitive files from being copied into the Docker build context.

```
target/
.git/
.gitignore
.env
*.log
.idea/
*.iml
.mvn/
mvnw
mvnw.cmd
```

---

### File 3: `code_Backend/src/main/resources/application.properties`
**Path:** `code_Backend/src/main/resources/application.properties`  
**Purpose:** Central Spring Boot configuration supporting dynamic cloud environment variable overrides for Render and Supabase with local development fallbacks.

```properties
spring.application.name=backend
spring.config.import=optional:file:./.env[.properties]

# Dynamic port binding for Render / Cloud (defaults to 8080 locally)
server.port=${PORT:8080}

# Database Datasource (Supports Render / Supabase environment variables with local fallback)
spring.datasource.url=${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/tripnestdb2ag}
spring.datasource.username=${SPRING_DATASOURCE_USERNAME:postgres}
spring.datasource.password=${SPRING_DATASOURCE_PASSWORD:${DB_PASSWORD:}}
spring.datasource.driver-class-name=org.postgresql.Driver

# Hibernate settings
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update

spring.jpa.show-sql=true

jwt.secret=${JWT_SECRET}

logging.level.org.springframework.security=DEBUG

spring.security.oauth2.client.registration.google.client-id=${GOOGLE_CLIENT_ID}
spring.security.oauth2.client.registration.google.client-secret=${GOOGLE_CLIENT_SECRET}
spring.security.oauth2.client.registration.google.scope=openid,profile,email

OPENWEATHER_API_KEY=${OPENWEATHER_API_KEY}

# Cloudinary Storage Configuration
cloudinary.url=${CLOUDINARY_URL:}
cloudinary.cloud-name=${CLOUDINARY_CLOUD_NAME:}
cloudinary.api-key=${CLOUDINARY_API_KEY:}
cloudinary.api-secret=${CLOUDINARY_API_SECRET:}
```

---

### File 4: `code_Backend/src/main/java/com/tripnest/backend/config/SecurityConfig.java`
**Path:** `code_Backend/src/main/java/com/tripnest/backend/config/SecurityConfig.java`  
**Purpose:** Spring Security configuration with `setAllowedOriginPatterns` permitting Vercel and Render domains alongside local development ports.

```java
package com.tripnest.backend.config;

import com.tripnest.backend.security.OAuth2LoginSuccessHandler;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.web.DefaultOAuth2AuthorizationRequestResolver;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizationRequestResolver;

@Configuration
public class SecurityConfig {

    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;
    private final ClientRegistrationRepository clientRegistrationRepository;

    public SecurityConfig(
            OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler,
            ClientRegistrationRepository clientRegistrationRepository) {

        this.oAuth2LoginSuccessHandler = oAuth2LoginSuccessHandler;
        this.clientRegistrationRepository = clientRegistrationRepository;
    }

    private OAuth2AuthorizationRequestResolver authorizationRequestResolver() {
        DefaultOAuth2AuthorizationRequestResolver resolver =
                new DefaultOAuth2AuthorizationRequestResolver(
                        this.clientRegistrationRepository,
                        "/oauth2/authorization"
                );
        resolver.setAuthorizationRequestCustomizer(customizer ->
                customizer.additionalParameters(params ->
                        params.put("prompt", "select_account")
                )
        );
        return resolver;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            .cors(Customizer.withDefaults())

            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.IF_REQUIRED
                )
            )

            .authorizeHttpRequests(auth -> auth

                .requestMatchers(
                    HttpMethod.OPTIONS,
                    "/**"
                ).permitAll()

                .requestMatchers(
                    "/api/auth/**"
                ).permitAll()

                .requestMatchers(
                    HttpMethod.GET,
                    "/api/destinations/**",
                    "/api/attractions/**",
                    "/api/documents/files/**"
                ).permitAll()

                .anyRequest().authenticated()
            )

            .oauth2Login(oauth2 -> oauth2
                .authorizationEndpoint(auth -> auth
                    .authorizationRequestResolver(authorizationRequestResolver())
                )
                .successHandler(
                    oAuth2LoginSuccessHandler
                )
            )

            .oauth2ResourceServer(oauth2 ->
                oauth2.jwt(Customizer.withDefaults())
            );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config =
                new CorsConfiguration();

        config.setAllowedOriginPatterns(List.of(
            "http://localhost:*",
            "http://127.0.0.1:*",
            "https://*.vercel.app",
            "https://*.onrender.com"
        ));

        config.setAllowedMethods(List.of(
            "GET",
            "POST",
            "PUT",
            "DELETE",
            "OPTIONS",
            "HEAD"
        ));

        config.setAllowedHeaders(List.of(
            "Authorization",
            "Content-Type",
            "Accept",
            "X-Requested-With",
            "Origin"
        ));

        config.setExposedHeaders(
            List.of("Authorization")
        );

        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
            "/**",
            config
        );

        return source;
    }
}
```

---

### File 5: `code_Backend/src/main/java/com/tripnest/backend/security/OAuth2LoginSuccessHandler.java`
**Path:** `code_Backend/src/main/java/com/tripnest/backend/security/OAuth2LoginSuccessHandler.java`  
**Purpose:** Google OAuth2 login success handler with dynamic `FRONTEND_URL` redirect support for production Vercel frontend.

```java
package com.tripnest.backend.security;

import com.tripnest.backend.service.JwtService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2LoginSuccessHandler
        extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtService jwtService;

    public OAuth2LoginSuccessHandler(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication)
            throws IOException, ServletException {

        OAuth2User oauthUser =
                (OAuth2User) authentication.getPrincipal();

        String email = oauthUser.getAttribute("email");

        System.out.println("Google OAuth2 Login Successful!");
        System.out.println("Google User: " + email);

        String token = jwtService.generateToken(email);

        String frontendUrl = System.getenv("FRONTEND_URL");
        if (frontendUrl == null || frontendUrl.trim().isEmpty()) {
            frontendUrl = "http://localhost:5173";
        }
        if (frontendUrl.endsWith("/")) {
            frontendUrl = frontendUrl.substring(0, frontendUrl.length() - 1);
        }

        response.sendRedirect(
                frontendUrl + "/dashboard?token=" + token
        );
    }
}
```

---

### File 6: `code_Backend/pom.xml`
**Path:** `code_Backend/pom.xml`  
**Purpose:** Clean Maven POM with duplicate dependencies removed and Java 21 specified.

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
	<modelVersion>4.0.0</modelVersion>
	<parent>
		<groupId>org.springframework.boot</groupId>
		<artifactId>spring-boot-starter-parent</artifactId>
		<version>4.1.1</version>
		<relativePath/>
	</parent>
	<groupId>com.tripnest</groupId>
	<artifactId>backend</artifactId>
	<version>0.0.1-SNAPSHOT</version>
	<name>TripNest Backend</name>
	<description>TripNest Travel Intelligence &amp; Group Coordination API</description>

	<properties>
		<java.version>21</java.version>
	</properties>

	<dependencies>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-jpa</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security-oauth2-client</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security-oauth2-resource-server</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-validation</artifactId>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-webmvc</artifactId>
		</dependency>

		<dependency>
			<groupId>org.postgresql</groupId>
			<artifactId>postgresql</artifactId>
			<scope>runtime</scope>
		</dependency>

		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-devtools</artifactId>
			<scope>runtime</scope>
			<optional>true</optional>
		</dependency>
		<dependency>
			<groupId>org.projectlombok</groupId>
			<artifactId>lombok</artifactId>
			<optional>true</optional>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-data-jpa-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security-oauth2-client-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security-oauth2-resource-server-test</artifactId>
			<scope>test</scope>
		</dependency>

		<dependency>
			<groupId>org.springframework.security</groupId>
			<artifactId>spring-security-oauth2-jose</artifactId>
		</dependency>

		<!-- Cloudinary Java SDK for Cloud File & Document Storage -->
		<dependency>
			<groupId>com.cloudinary</groupId>
			<artifactId>cloudinary-http5</artifactId>
			<version>2.5.0</version>
		</dependency>

		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-security-test</artifactId>
			<scope>test</scope>
		</dependency>
		<dependency>
			<groupId>org.springframework.boot</groupId>
			<artifactId>spring-boot-starter-test</artifactId>
			<scope>test</scope>
		</dependency>
	</dependencies>

	<build>
		<plugins>
			<plugin>
				<groupId>org.apache.maven.plugins</groupId>
				<artifactId>maven-compiler-plugin</artifactId>
				<configuration>
					<annotationProcessorPaths>
						<path>
							<groupId>org.projectlombok</groupId>
							<artifactId>lombok</artifactId>
						</path>
					</annotationProcessorPaths>
				</configuration>
			</plugin>
			<plugin>
				<groupId>org.springframework.boot</groupId>
				<artifactId>spring-boot-maven-plugin</artifactId>
				<configuration>
					<excludes>
						<exclude>
							<groupId>org.projectlombok</groupId>
							<artifactId>lombok</artifactId>
						</exclude>
					</excludes>
				</configuration>
			</plugin>
		</plugins>
	</build>
</project>
```

---

### File 7: `code_FrontEnd/vercel.json`
**Path:** `code_FrontEnd/vercel.json`  
**Purpose:** Single-page application route rewrite mapping all deep URLs to `/index.html`.

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

### File 8: `code_FrontEnd/src/services/vaultService.js`
**Path:** `code_FrontEnd/src/services/vaultService.js`  
**Purpose:** Document vault client service with dynamic `import.meta.env.VITE_API_BASE_URL`.

```javascript
import apiClient from "./apiClient";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

/**
 * Vault Service: Handles API communication for Trip Document Vault & Media Hub.
 * Connected to Spring Boot DocumentVaultController:
 * - POST   /api/trips/{tripId}/documents       -> Upload file with category (multipart/form-data)
 * - GET    /api/trips/{tripId}/documents       -> List trip documents with optional category filter
 * - GET    /api/documents/{documentId}         -> View document metadata
 * - DELETE /api/documents/{documentId}         -> Delete document (uploader or trip owner)
 */
export const vaultService = {
  /**
   * Upload a travel document or photo to a trip vault.
   * @param {number|string} tripId - The trip ID
   * @param {File} file - Physical file object from file picker
   * @param {string} category - DocumentCategory (TICKET, BOOKING, RECEIPT, PHOTO, OTHER)
   * @param {string} [storageType] - Storage target: "CLOUD" (Cloudinary) or "LOCAL" (Server disk)
   * @returns {Promise<Object>} DocumentResponse DTO
   */
  async uploadDocument(tripId, file, category = "OTHER", storageType = "CLOUD") {
    const formData = new FormData();
    formData.append("file", file);
    if (category) {
      formData.append("category", category);
    }
    if (storageType) {
      formData.append("storageType", storageType);
    }

    const response = await apiClient.post(`/api/trips/${tripId}/documents`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  /**
   * Fetch all documents stored in a trip's vault, with optional category filter.
   * @param {number|string} tripId - The trip ID
   * @param {string} [category] - Optional category filter (TICKET, BOOKING, RECEIPT, PHOTO, OTHER)
   * @returns {Promise<Array>} List of DocumentResponse DTOs
   */
  async getDocumentsByTrip(tripId, category) {
    const params = category && category !== "ALL" ? { category } : {};
    const response = await apiClient.get(`/api/trips/${tripId}/documents`, { params });
    return response.data;
  },

  /**
   * Get metadata for a single document by its record ID.
   * @param {number|string} documentId - The document record ID
   * @returns {Promise<Object>} DocumentResponse DTO
   */
  async getDocumentById(documentId) {
    const response = await apiClient.get(`/api/documents/${documentId}`);
    return response.data;
  },

  /**
   * Delete a document from the vault.
   * Access rule: Only the uploader or the trip owner can perform this action.
   * @param {number|string} documentId - The document record ID
   * @returns {Promise<Object>} Deletion confirmation status
   */
  async deleteDocument(documentId) {
    const response = await apiClient.delete(`/api/documents/${documentId}`);
    return response.data;
  },

  /**
   * Resolves the full URL for streaming or downloading a physical file.
   * Converts relative backend storage paths (/api/documents/files/...) to absolute URLs.
   * @param {string} storageUrl - The storageUrl from DocumentResponse
   * @returns {string} Fully qualified URL
   */
  getFileUrl(storageUrl) {
    if (!storageUrl) return "";
    if (storageUrl.startsWith("http://") || storageUrl.startsWith("https://")) {
      return storageUrl;
    }
    return `${API_BASE_URL}${storageUrl.startsWith("/") ? "" : "/"}${storageUrl}`;
  },
};

export default vaultService;
```

---

### File 9: `code_FrontEnd/src/pages/Login.jsx`
**Path:** `code_FrontEnd/src/pages/Login.jsx`  
**Purpose:** Login view with dynamic `VITE_API_BASE_URL` routing for Google OAuth authorization.

```jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.message || "Invalid credentials. Please check your email and password."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <p className="auth-kicker">Welcome back</p>
          <h1>Log in to TripNest</h1>
          <p className="auth-subtitle">
            Plan, collaborate, and manage your group travel itineraries seamlessly.
          </p>
        </div>

        {error && <div className="auth-error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button className="primary-btn full-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <button
            type="button"
            className="google-btn"
            onClick={() => {
              const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";
              window.location.href = `${apiBase}/oauth2/authorization/google`;
            }}
          >
            <span>G</span>
            Continue with Google
          </button>

          <div className="auth-footer">
            <p>
              Don't have an account?{" "}
              <Link to="/register" className="auth-link">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
```

---

### File 10: `code_FrontEnd/src/services/apiClient.js`
**Path:** `code_FrontEnd/src/services/apiClient.js`  
**Purpose:** Central Axios instance configured with `import.meta.env.VITE_API_BASE_URL` and automatic JWT token attachment.

```javascript
import axios from "axios";

/**
 * Centralized Axios instance for TripNest Frontend.
 * Automatically attaches the JWT Bearer token from localStorage
 * to every outgoing request.
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Extract clean error message
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    let message = "An unexpected error occurred";
    const resData = error.response?.data;

    if (typeof resData === "string" && resData) {
      message = resData;
    } else if (resData?.message) {
      message = resData.message;
    } else if (resData && typeof resData === "object") {
      const values = Object.values(resData);
      if (values.length > 0 && typeof values[0] === "string") {
        message = values[0];
      }
    } else if (error.message) {
      message = error.message;
    }

    return Promise.reject(new Error(message));
  }
);

export default apiClient;
```

---

*Maintained by TripNest Engineering Team • Antigravity Pair-Programming Knowledge Base*
