#!/bin/sh
# Script to launch a live rtmp streaming session
# The script populates .env file with environment variables passed by docker-compose.yml

echo rtmpUrl=$RTMP_URL > .env
echo ffmpegServer=$FFMPEG_SERVER >> .env
echo ffmpegServerPort=$FFMPEG_SERVER_PORT >> .env
echo auth=$AUTH >> .env
echo copyToPath=$COPY_TO_PATH >> .env
echo playbackFile=$PLAYBACK_FILE >> .env

echo "debug env variables in .env"
cat .env
echo $JOIN_MEETING_URL

node ffmpegServer.js &

node liveRTMP.js $JOIN_MEETING_URL
