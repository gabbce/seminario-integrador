# Public Auth settings only. Runtime credentials are never build arguments.
FROM node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8 AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" && npm run build

FROM eclipse-temurin:21-jdk-jammy@sha256:6adefddd4a20bceef702cedb0b03952fcd7691f9c7ccffe27014992abc0b46bd AS backend
WORKDIR /build/backend
COPY backend/ ./
COPY --from=frontend /build/frontend/dist/ ./src/main/resources/static/
RUN --mount=type=cache,target=/root/.m2 chmod +x mvnw && ./mvnw -B -DskipTests package
COPY tools/docker/Healthcheck.java /build/Healthcheck.java
RUN javac -d /build/health /build/Healthcheck.java

FROM eclipse-temurin:21-jre-jammy@sha256:e9aaf73145bbd1f9f6ec7f6867dd75a44f34b1a6c32a813504bf4129be2d09d7
WORKDIR /app
COPY --from=backend /build/backend/target/aulas-0.0.1-SNAPSHOT.jar /app/aulas.jar
COPY --from=backend /build/health/ /app/health/
ENV SERVER_ADDRESS=0.0.0.0 PORT=8080
USER 1000:1000
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=90s --retries=3 CMD ["java","-cp","/app/health","Healthcheck"]
ENTRYPOINT ["java","-jar","/app/aulas.jar"]
