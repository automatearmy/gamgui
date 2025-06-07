FROM --platform=linux/amd64 python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for GAM and terminal tools
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    wget \
    unzip \
    git \
    vim \
    nano \
    procps \
    net-tools \
    iputils-ping \
    telnet \
    && rm -rf /var/lib/apt/lists/*

# Install GAM
RUN curl -s -S -L https://gam-shortn.appspot.com/gam-install > gam-install.sh && \
    bash gam-install.sh -d /usr/local/gam && \
    ln -s /usr/local/gam/gam /usr/local/bin/gam && \
    rm gam-install.sh

# Create GAM config directory
RUN mkdir -p /gam-config

# Copy Python requirements first (for better caching)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user for security but give access to common directories
RUN useradd -m -u 1000 gamworker && \
    chown -R gamworker:gamworker /app /gam-config && \
    mkdir -p /home/gamworker && \
    chown -R gamworker:gamworker /home/gamworker

# Switch to non-root user
USER gamworker

# Set working directory to user home for terminal commands
WORKDIR /home/gamworker

# Environment variables
ENV SESSION_ID="123"
ENV PORT=8080
ENV JWT_SECRET="dev-secret-no-auth"
ENV JWT_ALGORITHM="HS256"
ENV PROJECT_ID=""
ENV GAM_PATH="/usr/local/bin/gam"
ENV GAM_CONFIG_DIR="/gam-config"
ENV GAMCFGDIR="/gam-config"
ENV LOG_LEVEL="INFO"
ENV ALLOWED_ORIGINS="*"
ENV PATH="/usr/local/gam:$PATH"
ENV HOME="/home/gamworker"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Expose port
EXPOSE 8080

# Run the application from the app directory
CMD ["python", "/app/main.py"]
