import os
import cv2
import time
from ultralytics import YOLO

# 1. Force OpenCV to use TCP for low latency
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp"

MODEL_PATH = "models/best (26).pt"
RTSP_URL = "rtsp://localhost:8554/cam2_sub"


print("Loading YOLO model...")
model = YOLO(MODEL_PATH,task="detect")



# Warm up Apple Silicon MPS GPU backend
print("Warming up GPU (MPS)...")
model.track(source="https://ultralytics.com/images/bus.jpg", device="mps", verbose=False)

print("Opening stream...")
cap = cv2.VideoCapture(RTSP_URL, cv2.CAP_FFMPEG)
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

if not cap.isOpened():
    print("❌ Failed to connect to stream")
    exit()

print("✅ Connected! Displaying accelerated live preview...")

prev_time = time.time()

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        continue

    # 2. Hardware Accelerated Track (MPS + ByteTrack + 640 Res)
    results = model.track(
        frame, 
        persist=True, 
        device="mps",           # Uses Apple GPU
        imgsz=640,              # Downscales input for fast inference
        tracker="bytetrack.yaml", # Fast tracking algorithm
        verbose=False
    )

    # Plot bounding boxes onto the frame
    annotated_frame = results[0].plot()

    # Calculate real-time rendering FPS
    curr_time = time.time()
    fps = 1 / (curr_time - prev_time) if (curr_time - prev_time) > 0 else 0
    prev_time = curr_time

    # Display FPS on screen
    cv2.putText(
        annotated_frame, 
        f"FPS: {fps:.1f}", 
        (20, 40), 
        cv2.FONT_HERSHEY_SIMPLEX, 
        1, 
        (0, 255, 0), 
        2
    )

    # Show window
    cv2.imshow("CSMS Accelerated YOLO Preview", annotated_frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()