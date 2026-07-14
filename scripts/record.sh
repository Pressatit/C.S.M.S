#!/bin/bash
# ============================================================
# CSMS Recording Script
# Pulls stream from MediaMTX and writes segmented MP4 files
# to local recordings folder
#
# CONFIGURATION — change these values as needed
# ============================================================

# Stream source — MediaMTX RTSP relay path
STREAM_URL="rtsp://localhost:8554/cam2"

# Camera identifier — used for folder naming
CAMERA_ID="cam2"

# Segment duration in seconds
# 1800 = 30 minutes | 300 = 5 minutes | 600 = 10 minutes
SEGMENT_SECONDS=600

# Output directory — creates if absent
# Points to your CSMS project recordings folder
RECORDINGS_DIR="$(dirname "$(dirname "$0")")/recordings"

# Video encoding
# h264_videotoolbox = Apple Silicon hardware H.264 (recommended for Mac)
# hevc_videotoolbox = Apple Silicon hardware H.265 (smaller files, less browser support)
# libx264           = Software H.264 (any machine, more CPU)
VIDEO_CODEC="hevc_videotoolbox"

# Recording quality (only applies to software encoders like libx264)
# For videotoolbox hardware encoders, use -b:v bitrate instead
VIDEO_BITRATE="2000k"

# ============================================================
# DO NOT EDIT BELOW THIS LINE
# ============================================================

# Build today's output path: recordings/cam1/2026-06-30/
DATE_FOLDER=$(date +"%Y-%m-%d")
OUTPUT_DIR="$RECORDINGS_DIR/$CAMERA_ID/$DATE_FOLDER"

# Create directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

echo "============================================"
echo "CSMS Recording Started"
echo "Camera:   $CAMERA_ID"
echo "Output:   $OUTPUT_DIR"
echo "Segments: ${SEGMENT_SECONDS}s each"
echo "Codec:    $VIDEO_CODEC"
echo "============================================"

# Start FFmpeg recording loop
# -re = read at native frame rate (prevents buffer flooding)
# -rtsp_transport tcp = reliable delivery over TCP
# -i = input stream from MediaMTX
# -c:v = video codec (set above)
# -b:v = target video bitrate
# -c:a copy = copy audio as-is without re-encoding
# -f segment = use segment muxer to split into chunks
# -segment_time = how long each segment is in seconds
# -segment_format mp4 = container format for each segment
# -segment_atclocktime 1 = align segment boundaries to clock
#   (so 30min segments start at :00 and :30, not random offsets)
# -strftime 1 = use time formatting in output filename
# -reset_timestamps 1 = each segment starts from timestamp 0
#   (makes each file independently seekable)
# -movflags +faststart = write MP4 index at start of file
#   (allows playback before full download — critical for streaming)

ffmpeg \
  -rtsp_transport tcp \
  -i "$STREAM_URL" \
  -c:v "$VIDEO_CODEC" \
  -b:v "$VIDEO_BITRATE" \
  -c:a copy \
  -f segment \
  -segment_time "$SEGMENT_SECONDS" \
  -segment_format mp4 \
  -segment_atclocktime 1 \
  -strftime 1 \
  -reset_timestamps 1 \
  -movflags +faststart \
  "$OUTPUT_DIR/%H-%M-%S.mp4"

# If FFmpeg exits unexpectedly, log it
echo "Recording stopped at $(date). Exit code: $?"