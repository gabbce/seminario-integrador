# Public Auth settings only. Runtime credentials are never build arguments.
FROM node:24.14.0-bookworm-slim@sha256:d8e448a56fc63242f70026718378bd4b00f8c82e78d20eefb199224a4d8e33d8 AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/vite.config.ts frontend/tsconfig*.json ./
COPY frontend/src/ ./src/
COPY frontend/public/ ./public/
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" && npm run build

FROM eclipse-temurin:21-jdk-jammy@sha256:6adefddd4a20bceef702cedb0b03952fcd7691f9c7ccffe27014992abc0b46bd AS backend
WORKDIR /build/backend
COPY backend/pom.xml backend/mvnw ./
COPY backend/.mvn/ ./.mvn/
COPY backend/src/main/ ./src/main/
COPY --from=frontend /build/frontend/dist/ ./src/main/resources/static/
RUN --mount=type=cache,target=/root/.m2/repository \
    set -eu; \
    properties=.mvn/wrapper/maven-wrapper.properties; \
    distribution_url=$(sed -n 's/^distributionUrl=//p' "$properties"); \
    distribution_sha256=$(sed -n 's/^distributionSha256Sum=//p' "$properties"); \
    distribution_file=${distribution_url##*/}; \
    distribution_name=${distribution_file%.zip}; \
    distribution_name=${distribution_name%-bin}; \
    distribution_hash=$(printf '%s' "$distribution_url" | od -An -v -tu1 | awk '{ for (i = 1; i <= NF; i++) hash = (hash * 31 + $i) % 4294967296 } END { printf "%x", hash }'); \
    distribution_home="$HOME/.m2/wrapper/dists/$distribution_name/$distribution_hash"; \
    if [ ! -x "$distribution_home/bin/mvn" ]; then \
      archive="/tmp/$distribution_file"; \
      curl -fsSL "$distribution_url" -o "$archive"; \
      printf '%s  %s\n' "$distribution_sha256" "$archive" | sha256sum -c -; \
      mkdir -p "${distribution_home%/*}" /tmp/maven-distribution; \
      (cd /tmp/maven-distribution && jar xf "$archive"); \
      mv "/tmp/maven-distribution/$distribution_name" "$distribution_home"; \
      chmod +x "$distribution_home/bin/mvn"; \
      rm -f "$archive"; \
    fi; \
    chmod +x mvnw; \
    ./mvnw -B -DskipTests package
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
