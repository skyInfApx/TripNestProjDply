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
