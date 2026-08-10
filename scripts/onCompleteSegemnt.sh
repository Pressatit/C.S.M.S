#!/bin/bash
CAMERA_ID="${MTX_PATH#cam}"

if [ -z "$CAMERA_ID" ] || [ -z "$MTX_SEGMENT_PATH" ]; then
  echo "[on_segment_complete] Missing env vars MTX_PATH=$MTX_PATH MTX_SEGMENT_PATH=$MTX_SEGMENT_PATH" >> /tmp/mediamtx_hook.log
  exit 1
fi

# MediaMTX writes fragmented MP4 (moof/mdat) without a sidx index, which forces
# browsers to download the entire file before they can seek. Remux to a
# non-fragmented, faststart MP4 so seeking uses efficient byte-range requests.
SRC="$MTX_SEGMENT_PATH"
TMP="${SRC%.mp4}.faststart.mp4"
if [ -f "$SRC" ]; then
  if ffmpeg -y -v error -loglevel quiet -i "$SRC" -c copy -movflags +faststart "$TMP"; then
    mv -f "$TMP" "$SRC"
    echo " [$(date)] cam${CAMERA_ID} faststart remux ok: ${SRC}" >> /tmp/mediamtx_hook.log
  else
    rm -f "$TMP"
    echo " [$(date)] cam${CAMERA_ID} faststart remux FAILED: ${SRC}" >> /tmp/mediamtx_hook.log
  fi
fi

curl -s -o /dev/null \
  -w "%{http_code}" \
  -X POST \
  "http://localhost:8000/recordings/register?camera_id=${CAMERA_ID}&file_path=${MTX_SEGMENT_PATH}" \
  >> /tmp/mediamtx_hook.log 2>&1

echo " [$(date)] cam${CAMERA_ID} segment done" >> /tmp/mediamtx_hook.log