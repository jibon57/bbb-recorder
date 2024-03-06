FROM ubuntu:22.04
FROM node

RUN apt-get update && \
    apt-get upgrade -y && \
    apt-get install -y wget
RUN wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
RUN apt-get install -y ./google-chrome-stable_current_amd64.deb

RUN apt-get install -y \
    ffmpeg \
    google-chrome-stable \
    xvfb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /var/cache/* /var/log/*



RUN ffmpeg -version
RUN node --version && npm --version

WORKDIR /app
VOLUME /output
RUN echo "copyToPath=/output" > .env

COPY package.json ./
RUN npm install --ignore-scripts
COPY . ./
