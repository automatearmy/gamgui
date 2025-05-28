FROM debian:12-slim

# Install required packages
RUN apt-get update && apt-get install -y \
    curl \
    python3 \
    python3-pip \
    xz-utils \
    bash \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set up working directory
WORKDIR /gam

# Install GAM with -l flag to update to latest version without creating project or authorizations
# Using a different approach to handle the curl and bash execution
RUN curl -s -S -L https://git.io/gam-install > /tmp/gam-install.sh && \
    bash /tmp/gam-install.sh -l -d /gam && \
    rm /tmp/gam-install.sh

# Add GAM to PATH
ENV PATH="/gam/gam7:${PATH}"

# Set entrypoint to bash
ENTRYPOINT ["/bin/bash"] 