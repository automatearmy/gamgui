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

# Install GAM with the recommended method
RUN curl -s -S -L https://gam-shortn.appspot.com/gam-install > gam-install.sh && \
    bash gam-install.sh -d /usr/local/gam && \
    ln -s /usr/local/gam/gam /usr/local/bin/gam && \
    rm gam-install.sh && \
    # Verify GAM installation
    /usr/local/bin/gam version

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
    chown -R gamworker:gamworker /home/gamworker && \
    # Fix permissions on gam directory to allow non-root access
    chown -R gamworker:gamworker /usr/local/gam

# Switch to non-root user
USER gamworker

# Set working directory to user home for terminal commands
WORKDIR /home/gamworker

# Set PATH to include GAM
ENV PATH="/usr/local/gam:/usr/local/bin:$PATH"
ENV HOME="/home/gamworker"

# Expose port
EXPOSE 8080

# Run the application from the app directory
CMD ["python", "/app/main.py"]
