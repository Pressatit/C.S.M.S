/**
 * PlaybackPlayer.jsx
 * Construction Site AI Surveillance — Playback Component
 *
 * Dependencies:
 *   npm install hls.js date-fns
 *
 * Environment variables (in your .env):
 *   REACT_APP_API_BASE=http://your-mac-mini-ip-or-tailscale:8000
 *   REACT_APP_MEDIA_BASE=http://your-mac-mini-ip-or-tailscale:8888
 *
 * FastAPI endpoints this component expects:
 *   GET /playback/stream?camera={id}&date={YYYY-MM-DD}
 *     → { playlist_url: "http://.../{date}/cam{id}/index.m3u8" }
 *
 *   GET /playback/events?camera={id}&date={YYYY-MM-DD}
 *     → [{ id, timestamp_epoch, timestamp_clock, type, description,
 *           confidence, bbox: {x,y,w,h} (normalised 0-1) }]
 *
 *   POST /playback/export
 *     body: { camera, date, start_sec, end_sec }
 *     → triggers MP4 clip generation; responds with { clip_url }
 */

import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { format, parse } from "date-fns";

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE   = process.env.REACT_APP_API_BASE   || "http://localhost:8000";
const MEDIA_BASE = process.env.REACT_APP_MEDIA_BASE || "http://localhost:8888";

const CAMERAS = [
  { id: 1, label: "CAM 1 — PTZ North",    type: "ptz"     },
  { id: 2, label: "CAM 2 — PTZ South",    type: "ptz"     },
  { id: 3, label: "CAM 3 — ColorVu East", type: "colorvu" },
  { id: 4, label: "CAM 4 — ColorVu West", type: "colorvu" },
];

const EVENT_COLORS = {
  ppe:       "#e24b4a",
  zone:      "#EF9F27",
  machinery: "#4a7ab5",
  headcount: "#5DCAA5",
};

const EVENT_LABELS = {
  ppe:       "PPE Violation",
  zone:      "Zone Breach",
  machinery: "Machinery Alert",
  headcount: "Headcount",
};

const SPEED_OPTIONS = [0.5, 1, 2, 4];

// ─── Utility helpers ──────────────────────────────────────────────────────────

function fmtDuration(sec) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function epochToClockStr(epoch) {
  return format(new Date(epoch * 1000), "HH:mm:ss");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ControlButton({ onClick, title, active, large, children, style = {} }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active ? "#4a7ab5" : "#1e2130",
        border: `1px solid ${active ? "#4a7ab5" : "#2a2d3a"}`,
        color: active ? "#fff" : "#c0bdb6",
        width: large ? 42 : 34,
        height: large ? 42 : 34,
        borderRadius: large ? 9 : 7,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "background 0.15s, border-color 0.15s, color 0.15s",
        ...style,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = "#252a3a";
          e.currentTarget.style.borderColor = "#4a7ab5";
          e.currentTarget.style.color = "#fff";
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = "#1e2130";
          e.currentTarget.style.borderColor = "#2a2d3a";
          e.currentTarget.style.color = "#c0bdb6";
        }
      }}
    >
      {children}
    </button>
  );
}

function AlertPopup({ message }) {
  if (!message) return null;
  return (
    <div style={{
      position: "absolute",
      bottom: 70,
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(180,30,30,0.92)",
      border: "1px solid #e24b4a",
      color: "#fff",
      fontSize: 12,
      padding: "6px 16px",
      borderRadius: 6,
      whiteSpace: "nowrap",
      fontWeight: 500,
      pointerEvents: "none",
      zIndex: 10,
      fontFamily: "'DM Mono', monospace",
    }}>
      {message}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlaybackPlayer() {
  // ── State ──
  const [selectedCam, setSelectedCam]         = useState(CAMERAS[0]);
  const [selectedDate, setSelectedDate]       = useState(format(new Date(), "yyyy-MM-dd"));
  const [events, setEvents]                   = useState([]);
  const [activeFilters, setActiveFilters]     = useState({ ppe: true, zone: true, machinery: true, headcount: true });
  const [playing, setPlaying]                 = useState(false);
  const [currentTime, setCurrentTime]         = useState(0);
  const [duration, setDuration]               = useState(0);
  const [speed, setSpeed]                     = useState(1);
  const [volume, setVolume]                   = useState(0.8);
  const [muted, setMuted]                     = useState(false);
  const [loaded, setLoaded]                   = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState(null);
  const [alertMsg, setAlertMsg]               = useState(null);
  const [hoverTime, setHoverTime]             = useState(null);
  const [hoverX, setHoverX]                   = useState(0);
  const [exportLoading, setExportLoading]     = useState(false);
  const [activeEventId, setActiveEventId]     = useState(null);

  // ── Refs ──
  const videoRef      = useRef(null);
  const canvasRef     = useRef(null);
  const hlsRef        = useRef(null);
  const timelineRef   = useRef(null);
  const logRef        = useRef(null);
  const alertTimer    = useRef(null);

  // ── Derived ──
  const filteredEvents = events.filter(e => activeFilters[e.type]);

  // ─── Flash alert ────────────────────────────────────────────────────────────
  const showAlert = useCallback((msg) => {
    setAlertMsg(msg);
    clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(() => setAlertMsg(null), 3000);
  }, []);

  // ─── Load stream via HLS.js ──────────────────────────────────────────────────
  const loadStream = useCallback(async () => {
    if (!selectedCam || !selectedDate) return;
    setLoading(true);
    setError(null);
    setLoaded(false);
    setCurrentTime(0);
    setEvents([]);

    try {
      // 1. Fetch playlist URL from FastAPI
      const res = await fetch(
        `${API_BASE}/playback/stream?camera=${selectedCam.id}&date=${selectedDate}`
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const { playlist_url } = await res.json();

      // 2. Set up HLS.js
      const video = videoRef.current;
      if (!video) return;

      if (hlsRef.current) { hlsRef.current.destroy(); }

      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,       // playback mode, not live
          backBufferLength: 90,
        });
        hlsRef.current = hls;
        hls.loadSource(playlist_url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoaded(true);
          setLoading(false);
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) setError("Stream unavailable. Check NVR connection.");
          setLoading(false);
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS
        video.src = playlist_url;
        video.addEventListener("loadedmetadata", () => {
          setLoaded(true);
          setLoading(false);
        }, { once: true });
      }

      // 3. Fetch detection events for this day/camera
      const evRes = await fetch(
        `${API_BASE}/playback/events?camera=${selectedCam.id}&date=${selectedDate}`
      );
      if (evRes.ok) {
        const evData = await evRes.json();
        setEvents(evData);
      }

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }, [selectedCam, selectedDate]);

  // ─── Video event listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay  = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => setPlaying(false);

    video.addEventListener("timeupdate",      onTimeUpdate);
    video.addEventListener("durationchange",  onDurationChange);
    video.addEventListener("play",            onPlay);
    video.addEventListener("pause",           onPause);
    video.addEventListener("ended",           onEnded);

    return () => {
      video.removeEventListener("timeupdate",     onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play",           onPlay);
      video.removeEventListener("pause",          onPause);
      video.removeEventListener("ended",          onEnded);
    };
  }, []);

  // ─── Sync playbackRate & volume ──────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.volume = volume; v.muted = muted; }
  }, [volume, muted]);

  // ─── Draw bounding boxes on canvas ──────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = canvas?.parentElement;
    if (!canvas || !wrap) return;

    canvas.width  = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!loaded) return;

    const W = canvas.width;
    const H = canvas.height;

    // Find events whose detection window overlaps currentTime
    // Each detection is considered "active" for 3 seconds around its timestamp.
    // In production, timestamp_epoch is an absolute Unix epoch from your DB.
    // Here we compare against video.currentTime offset from session start.
    const sessionStart = events[0]?.session_start_epoch || 0;
    const absTime = sessionStart + currentTime;

    const active = filteredEvents.filter(ev => {
      const diff = Math.abs(ev.timestamp_epoch - absTime);
      return diff < 3;
    });

    active.forEach(ev => {
      const col  = EVENT_COLORS[ev.type] || "#fff";
      const b    = ev.bbox; // { x, y, w, h } normalised 0–1
      if (!b) return;

      const bx = b.x * W;
      const by = b.y * H;
      const bw = b.w * W;
      const bh = b.h * H;

      // Main box
      ctx.strokeStyle = col;
      ctx.lineWidth   = 2;
      ctx.strokeRect(bx, by, bw, bh);

      // Corner accents (L-shaped corners instead of full box)
      const cs = 14;
      ctx.fillStyle = col;
      [
        [bx,      by],
        [bx+bw-cs, by],
        [bx,      by+bh-cs],
        [bx+bw-cs, by+bh-cs],
      ].forEach(([x, y]) => {
        ctx.fillRect(x,    y,    cs, 2);
        ctx.fillRect(x,    y,    2,  cs);
      });

      // Label badge above box
      const labelText = `${ev.type.toUpperCase()} · ${ev.confidence}%`;
      ctx.font = "500 11px 'Instrument Sans', sans-serif";
      const tw = ctx.measureText(labelText).width;
      ctx.fillStyle = col;
      ctx.fillRect(bx, by - 20, tw + 12, 20);
      ctx.fillStyle = "#fff";
      ctx.fillText(labelText, bx + 6, by - 6);
    });

    // Update active event in log
    const nearest = filteredEvents.reduce((best, ev) => {
      const diff = Math.abs(ev.timestamp_epoch - absTime);
      return diff < 3 && diff < (best?.diff ?? Infinity) ? { ev, diff } : best;
    }, null);
    setActiveEventId(nearest?.ev?.id ?? null);

  }, [currentTime, filteredEvents, loaded, events]);

  // ─── Auto-scroll event log to active event ───────────────────────────────────
  useEffect(() => {
    if (!activeEventId || !logRef.current) return;
    const row = logRef.current.querySelector(`[data-event-id="${activeEventId}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeEventId]);

  // ─── Controls ────────────────────────────────────────────────────────────────
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !loaded) return;
    playing ? v.pause() : v.play();
  };

  const seek = (secs) => {
    const v = videoRef.current;
    if (!v || !loaded) return;
    v.currentTime = Math.max(0, Math.min(duration, v.currentTime + secs));
  };

  const seekToTime = (sec) => {
    const v = videoRef.current;
    if (!v || !loaded) return;
    v.currentTime = Math.max(0, Math.min(duration, sec));
  };

  // ─── Timeline interactions ────────────────────────────────────────────────────
  const handleTimelineClick = (e) => {
    if (!loaded || !duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToTime(pct * duration);
  };

  const handleTimelineMouseMove = (e) => {
    if (!duration) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(pct * duration);
    setHoverX(pct * 100);
  };

  // ─── Export clip ──────────────────────────────────────────────────────────────
  const exportClip = async () => {
    if (!loaded || exportLoading) return;
    const startSec = Math.max(0, currentTime - 30);
    const endSec   = Math.min(duration, currentTime + 30);
    setExportLoading(true);
    showAlert("Exporting 60s clip… FastAPI is processing.");
    try {
      const res = await fetch(`${API_BASE}/playback/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          camera:    selectedCam.id,
          date:      selectedDate,
          start_sec: startSec,
          end_sec:   endSec,
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const { clip_url } = await res.json();
      // Trigger browser download
      const a = document.createElement("a");
      a.href     = `${MEDIA_BASE}${clip_url}`;
      a.download = `clip_cam${selectedCam.id}_${selectedDate}_${Math.floor(startSec)}.mp4`;
      a.click();
      showAlert("Clip downloaded successfully.");
    } catch (err) {
      showAlert("Export failed — " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  const playedPct   = duration ? (currentTime / duration) * 100 : 0;

  const styles = {
    shell: {
      background: "#161a24",
      border: "1px solid #2a2d3a",
      borderRadius: 12,
      overflow: "hidden",
      fontFamily: "'Instrument Sans', sans-serif",
      fontSize: 13,
      color: "#e8e6e1",
      maxWidth: 960,
      margin: "0 auto",
    },
    topBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "10px 16px",
      borderBottom: "1px solid #2a2d3a",
      background: "#12151f",
      flexWrap: "wrap",
      gap: 8,
    },
    select: {
      background: "#1e2130",
      border: "1px solid #2a2d3a",
      color: "#e8e6e1",
      fontFamily: "inherit",
      fontSize: 12,
      padding: "5px 10px",
      borderRadius: 6,
      cursor: "pointer",
      outline: "none",
    },
    dateInput: {
      background: "#1e2130",
      border: "1px solid #2a2d3a",
      color: "#e8e6e1",
      fontFamily: "'DM Mono', monospace",
      fontSize: 11,
      padding: "5px 10px",
      borderRadius: 6,
      outline: "none",
    },
    loadBtn: {
      background: "#4a7ab5",
      border: "1px solid #4a7ab5",
      color: "#fff",
      fontFamily: "inherit",
      fontSize: 12,
      fontWeight: 600,
      padding: "5px 16px",
      borderRadius: 6,
      cursor: "pointer",
    },
    videoWrap: {
      position: "relative",
      width: "100%",
      aspectRatio: "16/9",
      background: "#000",
      overflow: "hidden",
    },
    video: { width: "100%", height: "100%", display: "block", objectFit: "cover" },
    canvas: { position: "absolute", top: 0, left: 0, width: "100%", height: "100%", pointerEvents: "none" },
    osd: {
      position: "absolute",
      top: 10,
      left: 10,
      display: "flex",
      flexDirection: "column",
      gap: 4,
      pointerEvents: "none",
    },
    osdCam: {
      fontFamily: "'DM Mono', monospace",
      fontSize: 10,
      color: "rgba(255,255,255,0.75)",
      background: "rgba(0,0,0,0.55)",
      padding: "2px 8px",
      borderRadius: 3,
    },
    osdTime: {
      fontFamily: "'DM Mono', monospace",
      fontSize: 13,
      color: "#fff",
      background: "rgba(0,0,0,0.65)",
      padding: "3px 10px",
      borderRadius: 3,
    },
    recBadge: {
      position: "absolute",
      top: 10,
      right: 10,
      display: "flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "'DM Mono', monospace",
      fontSize: 9,
      letterSpacing: "0.12em",
      color: "#e24b4a",
      background: "rgba(0,0,0,0.55)",
      padding: "3px 8px",
      borderRadius: 3,
      pointerEvents: "none",
    },
    placeholder: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      color: "#444",
    },
    timelineWrap: {
      padding: "10px 16px 6px",
      background: "#12151f",
      borderTop: "1px solid #1e2130",
    },
    timelineTrack: {
      position: "relative",
      height: 32,
      cursor: "pointer",
    },
    controls: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "10px 16px",
      background: "#12151f",
      borderTop: "1px solid #1e2130",
      flexWrap: "wrap",
    },
    timeDisplay: {
      fontFamily: "'DM Mono', monospace",
      fontSize: 12,
      color: "#888",
      whiteSpace: "nowrap",
      minWidth: 120,
    },
    filterRow: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 16px",
      background: "#12151f",
      flexWrap: "wrap",
    },
    filterLabel: {
      fontFamily: "'DM Mono', monospace",
      fontSize: 9,
      color: "#555",
      letterSpacing: "0.1em",
    },
    eventLog: {
      borderTop: "1px solid #2a2d3a",
      background: "#0f1117",
      maxHeight: 180,
      overflowY: "auto",
    },
    eventLogHeader: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 16px",
      borderBottom: "1px solid #1e2130",
      position: "sticky",
      top: 0,
      background: "#0f1117",
      zIndex: 1,
    },
  };

  return (
    <div style={styles.shell}>

      {/* ── TOP BAR ── */}
      <div style={styles.topBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <select
            value={selectedCam.id}
            style={styles.select}
            onChange={e => setSelectedCam(CAMERAS.find(c => c.id === parseInt(e.target.value)))}
          >
            {CAMERAS.map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <span style={{
            background: "#1a3a1a", border: "1px solid #2d6a1e",
            color: "#5a9e2f", fontFamily: "'DM Mono', monospace",
            fontSize: 9, letterSpacing: "0.12em", padding: "3px 8px", borderRadius: 4,
          }}>
            PLAYBACK
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="date"
            value={selectedDate}
            style={styles.dateInput}
            onChange={e => setSelectedDate(e.target.value)}
          />
          <button style={styles.loadBtn} onClick={loadStream} disabled={loading}>
            {loading ? "Loading…" : "Load Footage"}
          </button>
        </div>
      </div>

      {/* ── VIDEO AREA ── */}
      <div style={styles.videoWrap}>
        <video ref={videoRef} style={styles.video} />
        <canvas ref={canvasRef} style={styles.canvas} />

        {!loaded && !loading && !error && (
          <div style={styles.placeholder}>
            <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#444" strokeWidth={1.5}>
              <rect x={2} y={3} width={20} height={14} rx={2}/>
              <path d="M8 21h8M12 17v4"/>
            </svg>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#444" }}>
              Select a date and camera, then Load Footage
            </span>
          </div>
        )}

        {loading && (
          <div style={styles.placeholder}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#4a7ab5" }}>
              Connecting to NVR…
            </span>
          </div>
        )}

        {error && (
          <div style={styles.placeholder}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#e24b4a" }}>
              {error}
            </span>
          </div>
        )}

        {/* OSD */}
        {loaded && (
          <>
            <div style={styles.osd}>
              <div style={styles.osdCam}>{selectedCam.label}</div>
              <div style={styles.osdTime}>{fmtDuration(currentTime)}</div>
            </div>
            <div style={styles.recBadge}>
              <span style={{
                width: 6, height: 6, background: "#e24b4a", borderRadius: "50%",
                animation: "blink 1.2s ease-in-out infinite",
                display: "inline-block",
              }}/>
              PLAYBACK
            </div>
          </>
        )}

        <AlertPopup message={alertMsg} />
      </div>

      {/* ── TIMELINE ── */}
      <div style={styles.timelineWrap}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#555" }}>
            {fmtDuration(0)}
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#555" }}>
            {fmtDuration(duration / 2)}
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#555" }}>
            {fmtDuration(duration)}
          </span>
        </div>

        <div
          ref={timelineRef}
          style={styles.timelineTrack}
          onClick={handleTimelineClick}
          onMouseMove={handleTimelineMouseMove}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Track background */}
          <div style={{
            position: "absolute", top: 14, left: 0, right: 0,
            height: 4, background: "#1e2130", borderRadius: 2,
          }}/>

          {/* Played */}
          <div style={{
            position: "absolute", top: 14, left: 0,
            width: `${playedPct}%`, height: 4,
            background: "#4a7ab5", borderRadius: 2,
            pointerEvents: "none",
          }}/>

          {/* Event pins */}
          {filteredEvents.map(ev => {
            const pct = duration ? (
              // timestamp_epoch relative to session start
              ((ev.timestamp_epoch - (events[0]?.session_start_epoch || 0)) / duration)
            ) * 100 : 0;
            return (
              <div
                key={ev.id}
                title={ev.description}
                onClick={e => {
                  e.stopPropagation();
                  seekToTime(ev.timestamp_epoch - (events[0]?.session_start_epoch || 0));
                  showAlert(`${EVENT_LABELS[ev.type]}: ${ev.description}`);
                }}
                style={{
                  position: "absolute",
                  top: 6,
                  left: `${pct}%`,
                  width: 3,
                  height: 12,
                  background: EVENT_COLORS[ev.type],
                  borderRadius: 2,
                  transform: "translateX(-50%)",
                  cursor: "pointer",
                  zIndex: 2,
                  transition: "transform 0.15s",
                }}
                onMouseEnter={e => e.currentTarget.style.transform = "translateX(-50%) scaleY(1.5)"}
                onMouseLeave={e => e.currentTarget.style.transform = "translateX(-50%)"}
              />
            );
          })}

          {/* Hover time tooltip */}
          {hoverTime !== null && (
            <div style={{
              position: "absolute",
              bottom: 22,
              left: `${hoverX}%`,
              transform: "translateX(-50%)",
              background: "#1e2130",
              border: "1px solid #2a2d3a",
              color: "#e8e6e1",
              fontSize: 10,
              padding: "3px 8px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              fontFamily: "'DM Mono', monospace",
              zIndex: 5,
            }}>
              {fmtDuration(hoverTime)}
            </div>
          )}

          {/* Scrubber thumb */}
          <div style={{
            position: "absolute",
            top: 8,
            left: `${playedPct}%`,
            width: 16,
            height: 16,
            background: "#fff",
            borderRadius: "50%",
            transform: "translateX(-50%)",
            pointerEvents: "none",
            border: "2px solid #4a7ab5",
            boxShadow: "0 0 0 3px rgba(74,122,181,0.2)",
          }}/>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={styles.controls}>

        {/* Back 30s */}
        <ControlButton onClick={() => seek(-30)} title="Back 30s">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 18V6l-8.5 6L11 18zm.5-6l8.5 6V6l-8.5 6z"/>
          </svg>
        </ControlButton>

        {/* Back 5s */}
        <ControlButton onClick={() => seek(-5)} title="Back 5s">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
          </svg>
        </ControlButton>

        {/* Play / Pause */}
        <ControlButton onClick={togglePlay} title="Play / Pause" active large>
          {playing ? (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
          ) : (
            <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </ControlButton>

        {/* Forward 5s */}
        <ControlButton onClick={() => seek(5)} title="Forward 5s">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 18l8.5-6L6 6v12zm2-8.14L11.03 12 8 14.14V9.86zM16 6h2v12h-2z"/>
          </svg>
        </ControlButton>

        {/* Forward 30s */}
        <ControlButton onClick={() => seek(30)} title="Forward 30s">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
            <path d="M13 6v12l8.5-6L13 6zM4 18l8.5-6L4 6v12z"/>
          </svg>
        </ControlButton>

        {/* Time display */}
        <div style={styles.timeDisplay}>
          <span style={{ color: "#e8e6e1" }}>{fmtDuration(currentTime)}</span>
          {" / "}
          {fmtDuration(duration)}
        </div>

        {/* Speed buttons */}
        {SPEED_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            style={{
              background: speed === s ? "#4a7ab5" : "#1e2130",
              border: `1px solid ${speed === s ? "#4a7ab5" : "#2a2d3a"}`,
              color: speed === s ? "#fff" : "#888",
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              padding: "0 10px",
              height: 34,
              borderRadius: 7,
              cursor: "pointer",
            }}
          >
            {s}×
          </button>
        ))}

        <div style={{ flex: 1 }}/>

        {/* Mute button */}
        <ControlButton onClick={() => setMuted(m => !m)} title="Mute" active={muted}>
          {muted ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          ) : (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
          )}
        </ControlButton>

        {/* Volume slider */}
        <input
          type="range"
          min={0} max={1} step={0.05}
          value={muted ? 0 : volume}
          onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
          style={{ width: 70, cursor: "pointer", accentColor: "#4a7ab5" }}
        />

        {/* Export */}
        <ControlButton
          onClick={exportClip}
          title="Export ±30s clip"
          style={{ marginLeft: 8 }}
        >
          {exportLoading ? (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
            </svg>
          ) : (
            <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
            </svg>
          )}
        </ControlButton>
      </div>

      {/* ── FILTER ROW ── */}
      <div style={styles.filterRow}>
        <span style={styles.filterLabel}>FILTER EVENTS</span>
        {Object.entries(EVENT_COLORS).map(([type, color]) => {
          const on = activeFilters[type];
          return (
            <button
              key={type}
              onClick={() => setActiveFilters(f => ({ ...f, [type]: !f[type] }))}
              style={{
                background: on ? `${color}22` : "#1e2130",
                border: `1px solid ${on ? color : "#2a2d3a"}`,
                color: on ? color : "#555",
                fontFamily: "'DM Mono', monospace",
                fontSize: 9,
                padding: "3px 10px",
                borderRadius: 4,
                cursor: "pointer",
                letterSpacing: "0.06em",
                transition: "all 0.15s",
              }}
            >
              {type.toUpperCase()}
            </button>
          );
        })}
        <div style={{ flex: 1 }}/>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4a7ab5" }}>
          {filteredEvents.length} EVENTS
        </span>
      </div>

      {/* ── EVENT LOG ── */}
      <div style={styles.eventLog} ref={logRef}>
        <div style={styles.eventLogHeader}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.15em", color: "#555" }}>
            DETECTION LOG — {selectedDate} · {selectedCam.label}
          </span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4a7ab5" }}>
            {filteredEvents.length} events
          </span>
        </div>

        {filteredEvents.length === 0 && (
          <div style={{ padding: "20px 16px", textAlign: "center", color: "#444", fontFamily: "'DM Mono', monospace", fontSize: 11 }}>
            {loaded ? "No events match current filters" : "Load footage to see detection events"}
          </div>
        )}

        {filteredEvents
          .sort((a, b) => a.timestamp_epoch - b.timestamp_epoch)
          .map(ev => {
            const isActive = ev.id === activeEventId;
            return (
              <div
                key={ev.id}
                data-event-id={ev.id}
                onClick={() => {
                  seekToTime(ev.timestamp_epoch - (events[0]?.session_start_epoch || 0));
                  showAlert(`${EVENT_LABELS[ev.type]}: ${ev.description}`);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "7px 16px",
                  borderBottom: "1px solid #161a24",
                  cursor: "pointer",
                  background: isActive ? "#1a2030" : "transparent",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#161a24"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: EVENT_COLORS[ev.type], flexShrink: 0,
                }}/>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#555", minWidth: 62 }}>
                  {ev.timestamp_clock || epochToClockStr(ev.timestamp_epoch)}
                </div>
                <div style={{ fontSize: 11, color: "#c0bdb6", flex: 1 }}>{ev.description}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#555" }}>
                  {ev.confidence}%
                </div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4a7ab5", opacity: 0, transition: "opacity 0.15s" }}
                  className="jump-label">
                  → JUMP
                </div>
              </div>
            );
          })}
      </div>

      {/* Keyframe for rec dot blink */}
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }
      `}</style>
    </div>
  );
}
