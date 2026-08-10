import os
import cv2
import time
import requests
from ultralytics import YOLO

BACKEND_URL=os.getenv("BACKEND_URL")

# 1 Force OpenCV to use TCP for low latency over RTSP
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

# Configuration Constants
MODEL_PATH = "models/best (26).onnx"  
RTSP_URL = "rtsp://localhost:8554/cam1"
# Quick local fix for testing
FASTAPI_INGEST_URL = "http://localhost:8000/detections/ingest"

CAMERA_ID = 1
CONF_THRESHOLD = 0.25
TARGET_FPS = 15 
FRAME_INTERVAL = 1.0 / TARGET_FPS  # ~0.0667 seconds between frames

print("Loading YOLO model...")
model = YOLO(MODEL_PATH, task="detect")

# Warm up Apple Silicon MPS GPU backend
print("Warming up Apple MPS GPU...")
model.track(source="https://ultralytics.com/images/bus.jpg", device="mps", verbose=False)

print(f"Connecting to MediaMTX stream: {RTSP_URL}...")
cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

if not cap.isOpened():
    print("❌ Failed to connect to RTSP stream. Ensure MediaMTX is running!")
    exit(1)


print(f"✅ Worker connected! Running inference loop at ~{TARGET_FPS} FPS...")

session_start_epoch = int(time.time())
last_frame_time = time.time()

try:
 failed_frames = 0
 MAX_FAILED_FRAMES = 30      # ~2 seconds at 15fps before reconnect attempt
 MAX_RECONNECT_ATTEMPTS = 5  # give up after 5 consecutive failures
 reconnect_attempts = 0

 while cap.isOpened():
    current_time = time.time()
    elapsed = current_time - last_frame_time

    if elapsed < FRAME_INTERVAL:
        time.sleep(FRAME_INTERVAL - elapsed)
        continue

    ret, frame = cap.read()

    if not ret or frame is None:
        failed_frames += 1

        if failed_frames > MAX_FAILED_FRAMES:
            reconnect_attempts += 1
            print(f"⚠️ Stream lost! Reconnect attempt {reconnect_attempts}/{MAX_RECONNECT_ATTEMPTS}...")

            cap.release()

            if reconnect_attempts > MAX_RECONNECT_ATTEMPTS:
                print("❌ Max reconnect attempts reached. Exiting worker.")
                break

            # Exponential backoff — wait longer each failed attempt
            # attempt 1 = 2s, attempt 2 = 4s, attempt 3 = 8s, max 30s
            wait = min(2 ** reconnect_attempts, 30)
            print(f"   Waiting {wait}s before retry...")
            time.sleep(wait)

            cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            failed_frames = 0

            if cap.isOpened():
                print("✅ Reconnected successfully!")
                reconnect_attempts = 0  # reset on success
        else:
            time.sleep(0.01)

        continue

    # Successful frame — reset both counters
    failed_frames = 0
    reconnect_attempts = 0
    last_frame_time = time.time()

    last_frame_time = time.time()
    height, width, _ = frame.shape
    current_epoch = int(last_frame_time)

        # 2. Hardware Accelerated Track (MPS + ByteTrack + 640 Res)
    results = model.track(
            frame,
            persist=True,
            device="mps",
            imgsz=640,
            tracker="bytetrack.yaml",
            verbose=False
        )

    frame_detections = []

        # 3. Process bounding boxes
    if results[0].boxes:
            for box in results[0].boxes:
                conf = float(box.conf[0].item())
                if conf < CONF_THRESHOLD:
                    continue

                cls_id = int(box.cls[0].item())
                class_name = model.names[cls_id]
                track_id = int(box.id[0].item()) if box.id is not None else None

                # Raw pixel coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()

                # Relative clock offset (seconds into the shift/session)
                timestamp_clock = current_epoch - session_start_epoch

                # Normalized coordinates (0.0 to 1.0) for responsive UI scaling
                bbox_normalized = {
                    "x": round(x1 / width, 4),
                    "y": round(y1 / height, 4),
                    "w": round((x2 - x1) / width, 4),
                    "h": round((y2 - y1) / height, 4)
                }

                frame_detections.append({
                    "camera_id": CAMERA_ID,
                    "event_type": class_name,
                    "confidence": round(conf, 2),
                    "track_id": track_id,
                    "bbox": bbox_normalized,
                    "timestamp_epoch": current_epoch,
                    "timestamp_clock": timestamp_clock,
                    "session_start_epoch": session_start_epoch
                })

        # 4. Post payload to FastAPI ingest endpoint
    payload = {
            "camera_id": CAMERA_ID,
            "frame_timestamp": last_frame_time,
            "detections": frame_detections
        }
       
    if len(frame_detections) > 0:
            try:
                # Increased timeout to 0.5 seconds so FastAPI has time to respond
                response = requests.post(FASTAPI_INGEST_URL, json=payload, timeout=0.5)
                
                if response.status_code == 200:
                    print(f"✅ Sent {len(frame_detections)} detections to FastAPI")
                else:
                    print(f"⚠️ FastAPI rejected payload: {response.status_code} - {response.text}")
            
            except requests.exceptions.RequestException as e:
                # Stop failing silently! Print the network error.
                print(f"❌ Connection to FastAPI failed: {e}")

except KeyboardInterrupt:
    print("\nStopping YOLO Worker...")
finally:
    cap.release()
    print("Worker stopped safely.")