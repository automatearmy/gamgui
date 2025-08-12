# Start from ubuntu
FROM --platform=linux/amd64 ubuntu:jammy

# Install dependencies
RUN apt-get update && apt-get install -y \
    tmux \
    git \
    vim \
    curl \
    procps \
    wget \
    python3 \
    python3-pip \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    && rm -rf /var/lib/apt/lists/*

# Install Google Cloud SDK
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list && \
    curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add - && \
    apt-get update && apt-get install -y google-cloud-cli && \
    rm -rf /var/lib/apt/lists/*

# Install zsh and use "robbyrussell" theme
RUN sh -c "$(wget -O- https://github.com/deluan/zsh-in-docker/releases/download/v1.2.1/zsh-in-docker.sh)" -- \
    -t robbyrussell

# Set zsh as the default shell for all docker operations
SHELL ["/bin/zsh", "-c"]

# Install GAM
RUN curl -s -S -L https://git.io/gam-install > /tmp/gam-install.sh && \
    bash /tmp/gam-install.sh -l -d /usr/local/gam && \
    rm /tmp/gam-install.sh

# Configure tmux
RUN echo "set -g mouse on" > /root/.tmux.conf && \
    echo "set -g history-limit 10000" >> /root/.tmux.conf && \
    echo "set-option -g default-shell /usr/bin/zsh" >> /root/.tmux.conf && \
    echo "set -g aggressive-resize on" >> /root/.tmux.conf && \
    echo "set -g allow-rename off" >> /root/.tmux.conf && \
    echo "set -g status off" >> /root/.tmux.conf && \
    echo "set -g automatic-rename off" >> /root/.tmux.conf

# Copy and setup startup script
COPY start-session.sh /usr/local/bin/start-session.sh
RUN chmod +x /usr/local/bin/start-session.sh

WORKDIR /workspace
