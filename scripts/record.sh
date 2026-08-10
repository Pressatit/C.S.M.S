#!/bin/bash
# ============================================================
# CSMS Recording Script (Template)
# ============================================================

# Read from command line arguments
CAMERA_ID="$1"
STREAM_URL="$2"

# Safety check: ensure arguments were provided
if [ -z "$CAMERA_ID" ] || [ -z "$STREAM_URL" ]; then
  echo "❌ Error: Missing arguments."
  echo "Usage: ./record.sh <camera_id> <stream_url>"
  echo "Example: ./record.sh cam2 rtsp://localhost:8554/cam2"
  exit 1
fi

SEGMENT_SECONDS=600
RECORDINGS_DIR="$(dirname "$(dirname "$0")")/recordings"
API_BASE="http://localhost:8000"
CAMERA_NUM="${CAMERA_ID#cam}"  

register_segment() {
  local file="$1"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -G \
    --data-urlencode "camera_id=${CAMERA_NUM}" \
    --data-urlencode "file_path=${file}" \
    "${API_BASE}/recordings/register")
  echo "[$(date)] registered ${file} → HTTP ${code}" >> "$(dirname "$0")/record.log"
}

VIDEO_CODEC="hevc_videotoolbox"
VIDEO_BITRATE="2000k"

echo "============================================"
echo "CSMS Recording Started"
echo "Camera:   $CAMERA_ID"
echo "Source:   $STREAM_URL"
echo "Segments: ${SEGMENT_SECONDS}s each"
echo "============================================"

# The loop runs forever for THIS specific camera
while true; do
  # Check the date INSIDE the loop so it safely rolls over at midnight
  DATE_FOLDER=$(date +"%Y-%m-%d")
  OUTPUT_DIR="$RECORDINGS_DIR/$CAMERA_ID/$DATE_FOLDER"
  mkdir -p "$OUTPUT_DIR"
  
  OUTFILE="$OUTPUT_DIR/$(date +%H-%M-%S).mp4"
  
  ffmpeg -rtsp_transport tcp -i "$STREAM_URL" \
    -c:v "$VIDEO_CODEC" -b:v "$VIDEO_BITRATE" -c:a copy \
    -t "$SEGMENT_SECONDS" \
    -movflags +faststart \
    -y "$OUTFILE"
    
  if [ $? -ne 0 ]; then
    echo "[$(date)] [$CAMERA_ID] ffmpeg failed, retrying in 5s..." >> "$(dirname "$0")/record.log"
    sleep 5
    continue
  fi
  
  register_segment "$OUTFILE"
done