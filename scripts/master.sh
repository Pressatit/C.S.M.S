#!/bin/bash
# 
# CSMS Master Camera Launcher
#




 ffmpeg -f avfoundation -framerate 30 -video_size 1280x720 -i "0" -c:v libx264 -preset ultrafast -tune zerolatency -g 30 -sc_threshold 0 -b:v 800k \
 -rtsp-transport tcp -f rtsp rtsp://localhost:8554/cam2 \
 -rtsp-transport tcp -f rtsp rtsp://localhost:8554/cam3 &


sleep 3

echo "Starting CSMS Camera Recordings..."

# Make sure record.sh is executable
chmod +x record.sh

# Launch Camera 1 in the background
./record.sh cam1 rtsp://localhost:8554/cam1 &

# Launch Camera 2 in the background
./record.sh cam2 rtsp://localhost:8554/cam2 &

# Launch Camera 3 in the background
./record.sh cam3 rtsp://localhost:8554/cam3 &



echo "✅ All cameras have been initialized in the background!"
echo "Check record.log for activity."