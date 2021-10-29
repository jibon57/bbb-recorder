FROM docker.io/library/node:14-bullseye

RUN curl -sS -o - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add
RUN echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list
RUN apt-get -y update \
    && apt-get upgrade -y \
    && apt-get install -y \
    ffmpeg \
    google-chrome-stable \
    xvfb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* /var/cache/* /var/log/*

RUN node --version && npm --version

WORKDIR /app
VOLUME /output
RUN echo "copyToPath=/output" > .env

COPY package.json ./
RUN npm install --ignore-scripts
COPY . ./
