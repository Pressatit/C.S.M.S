import { useState, useEffect, useRef, useCallback, useMemo, startTransition } from "react";
import { format } from "date-fns";
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Download, RotateCw, ChevronRight, Monitor
} from "lucide-react";
import { apiRequest } from "../../utils/api";

const CAMERAS = [
  { id: 1, label: "CAM 1 ",    type: "ptz"     },
  { id: 2, label: "CAM 2 ",    type: "ptz"     },
  { id: 3, label: "CAM 3 ",    type: "colorvu" },
  { id: 4, label: "CAM 4 ",    type: "colorvu" },
  { id: 5, label: "CAM 5 ",    type: "colorvu" },
];

const EVENT_COLORS = {
  ppe:       "#e24b4a",
  machinery: "#e9c93f",
  headcount: "#5DCAA5",
};

const EVENT_LABELS = {
  ppe:       "PPE Violation",
  zone:      "Zone Breach",
  machinery: "Machinery Alert",
  headcount: "Headcount",
};

const SPEED_OPTIONS = [0.5, 1, 2, 4];

const DAY_START_HOUR = 18;
const DAY_END_HOUR = 23;
const DAY_START_MINUTES = DAY_START_HOUR * 60;
const DAY_END_MINUTES = DAY_END_HOUR * 60;
const DAY_SPAN_MINUTES = DAY_END_MINUTES - DAY_START_MINUTES;

function fmtDuration(sec: number) {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

function fmtClock(minutes: number) {
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function getDayMinutes(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function epochToClockStr(epoch: number) {
  return format(new Date(epoch * 1000), "HH:mm:ss");
}

function AlertPopup({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="absolute bottom-[70px] left-1/2 -translate-x-1/2 z-10 pointer-events-none">
      <div className="bg-red-600/90 text-white text-xs font-medium px-4 py-1.5 rounded-md whitespace-nowrap shadow-lg">
        {message}
      </div>
    </div>
  );
}

export  function PlaybackPlayer() {
  const [selectedCam, setSelectedCam] = useState(CAMERAS[0]);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [events, setEvents] = useState<any[]>([]);
  const [activeFilters, setActiveFilters] = useState({ ppe: true, zone: true, machinery: true, headcount: true });
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [hasFootage, setHasFootage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  const [exportLoading, setExportLoading] = useState(false);
  const [activeEventId, setActiveEventId] = useState<number | null>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [globalTime, setGlobalTime] = useState(0);
  const [globalDuration, setGlobalDuration] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const alertTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const overlayTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const currentTimeRef = useRef(0);
  const activeEventIdRef = useRef<number | null>(null);
  const footageRequestRef = useRef(0);
  const videoLoadRef = useRef(0);
  const activeSegmentIndexRef = useRef(0);
  const segmentListCacheRef = useRef(new Map<string, Promise<any[]>>());

  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);

  const revealOverlay = useCallback(() => {
    setShowOverlay(true);
    clearTimeout(overlayTimer.current);
    if (playing) overlayTimer.current = setTimeout(() => setShowOverlay(false), 2000);
  }, [playing]);

  const handleVideoMouseEnter = useCallback(() => setShowOverlay(true), []);
  const handleVideoMouseLeave = useCallback(() => {
    if (playing) setShowOverlay(false);
  }, [playing]);

  const filteredEvents = useMemo(
    () => events.filter(e => activeFilters[e.type as keyof typeof activeFilters]),
    [events, activeFilters]
  );

  const availableBlocks = useMemo(() => {
    return segments.map(seg => {
      const start = new Date(seg.started_at);
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const durationSecs = seg.duration_secs
        || ((new Date(seg.ended_at).getTime() - start.getTime()) / 1000)
        || 600;
      const endMinutes = startMinutes + durationSecs / 60;
      return {
        startMinutes,
        endMinutes,
        visibleStart: Math.max(startMinutes, DAY_START_MINUTES),
        visibleEnd: Math.min(endMinutes, DAY_END_MINUTES),
        startOffset: seg.startOffset,
        durationSecs,
      };
    }).filter(block => block.visibleEnd > block.visibleStart);
  }, [segments]);

  const showAlert = useCallback((msg: string) => {
    setAlertMsg(msg);
    clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(() => setAlertMsg(null), 3000);
  }, []);

  const getRecordingList = useCallback((cameraId: number, date: string) => {
    const key = `${cameraId}:${date}`;
    const cached = segmentListCacheRef.current.get(key);
    if (cached) return cached;

    const request = apiRequest<any[]>(`/recordings/list?camera_id=${cameraId}&date=${date}`)
      .catch(error => {
        segmentListCacheRef.current.delete(key);
        throw error;
      });
    segmentListCacheRef.current.set(key, request);
    return request;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getRecordingList(selectedCam.id, selectedDate)
      .then(recordings => {
        const firstRecording = recordings[0];
        if (cancelled || !firstRecording) return;

        // Warm the first megabyte (MP4 metadata and opening keyframe) while the
        // user is selecting footage, before they press Load Footage.
        void fetch(firstRecording.video_url, {
          headers: { Range: "bytes=0-1048575" },
        }).catch(() => undefined);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [selectedCam.id, selectedDate, getRecordingList]);

  const loadVideoSource = useCallback((
    source: string,
    startTime = 0,
    autoplay = false,
    updatePlaybackState = true,
    onSourceError?: () => void,
    onReady?: () => void,
  ) => {
    const loadId = ++videoLoadRef.current;
    const video = videoRef.current;
    if (!video) return;

    setBuffering(true);
    if (updatePlaybackState) {
      setLoading(true);
      setError(null);
    }
    video.src = source;
    video.load();

    video.addEventListener("loadedmetadata", () => {
      if (loadId !== videoLoadRef.current) return;
      video.currentTime = Math.min(startTime, Math.max(0, video.duration || startTime));
    }, { once: true });
    video.addEventListener("canplay", () => {
      if (loadId !== videoLoadRef.current) return;
      if (updatePlaybackState) {
        setLoaded(true);
        setHasFootage(true);
        setLoading(false);
      }
      // A new source resets playbackRate/volume/muted; re-apply them so speed
      // and audio survive segment switches.
      video.playbackRate = speed;
      video.volume = volume;
      video.muted = muted;
      setBuffering(false);
      onReady?.();
      if (autoplay) void video.play();
    }, { once: true });
    video.addEventListener("error", () => {
      if (loadId !== videoLoadRef.current) return;
      setBuffering(false);
      if (onSourceError) {
        onSourceError();
      } else if (updatePlaybackState) {
        setError("Could not load video file.");
        setLoading(false);
      }
    }, { once: true });
  }, [speed, volume, muted]);

  const fetchSegments = useCallback(async () => {
    if (!selectedCam || !selectedDate) return;
    const requestId = ++footageRequestRef.current;
    setLoading(true);
    setError(null);

    try {
      const rawSegments = await getRecordingList(selectedCam.id, selectedDate);
      if (requestId !== footageRequestRef.current) return;
      if (!rawSegments.length) throw new Error("No recordings found for that date.");

      let cumulative = 0;
      const withOffsets = rawSegments.map((seg: any) => {
        const segDuration = seg.duration_secs || 600;
        const withOffset = { ...seg, startOffset: cumulative, duration: segDuration };
        cumulative += segDuration;
        return withOffset;
      });

      // Try each segment in order; skip any whose file fails to load (e.g. a
      // stale DB row) instead of hard-failing on the first one.
      const tryLoadSegment = (index: number) => {
        if (requestId !== footageRequestRef.current) return;
        if (index >= withOffsets.length) {
          setError("No playable footage found for that date.");
          setLoading(false);
          setBuffering(false);
          return;
        }
        loadVideoSource(
          withOffsets[index].video_url,
          0,
          false,
          true,
          () => {
            if (requestId !== footageRequestRef.current) return;
            tryLoadSegment(index + 1);
          },
          () => {
            activeSegmentIndexRef.current = index;
          },
        );
      };
      tryLoadSegment(0);

      // Keep the current playback UI on screen while the new source buffers.
      // These updates are secondary to starting the video request above.
      startTransition(() => {
        setSegments(withOffsets);
        setGlobalDuration(cumulative);
        setGlobalTime(0);
        setCurrentTime(0);
      });

      void apiRequest<any[]>(`/playback/events?camera=${selectedCam.id}&date=${selectedDate}`)
        .then(evData => {
          if (requestId === footageRequestRef.current) {
            startTransition(() => setEvents(evData));
          }
        })
        .catch(() => {
          // Events are optional and must not delay footage playback.
        });
    } catch (err: any) {
      if (requestId !== footageRequestRef.current) return;
      setError(err.message);
      setLoading(false);
    }
  }, [selectedCam, selectedDate, getRecordingList, loadVideoSource]);

  const loadSegmentAtGlobalTime = useCallback((targetGlobalTime: number) => {
    if (!segments.length) return;
    let index = segments.findIndex((seg, i) => {
      const nextStart = segments[i + 1]?.startOffset ?? Infinity;
      return targetGlobalTime >= seg.startOffset && targetGlobalTime < nextStart;
    });
    if (index === -1) index = segments.length - 1;
    const segment = segments[index];
    const localTime = Math.max(0, targetGlobalTime - segment.startOffset);
    if (index !== activeSegmentIndexRef.current) {
      activeSegmentIndexRef.current = index;
      loadVideoSource(segment.video_url, localTime, !videoRef.current?.paused, false);
    } else {
      if (videoRef.current) videoRef.current.currentTime = localTime;
    }
  }, [segments, loadVideoSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      const segment = segments[activeSegmentIndexRef.current];
      if (segment) setGlobalTime(segment.startOffset + video.currentTime);
    };
    const onDurationChange = () => setDuration(video.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      const nextIndex = activeSegmentIndexRef.current + 1;
      if (nextIndex < segments.length) {
        loadSegmentAtGlobalTime(segments[nextIndex].startOffset);
        video.play();
      } else {
        setPlaying(false);
      }
    };
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("durationchange", onDurationChange);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("durationchange", onDurationChange);
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [segments, loadSegmentAtGlobalTime]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.volume = volume; v.muted = muted; }
  }, [volume, muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap) return;
    canvas.width = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (!loaded) return;
      const W = canvas.width;
      const H = canvas.height;
      const sessionStart = events[0]?.session_start_epoch || 0;
      const absTime = sessionStart + currentTimeRef.current;
      const active = filteredEvents.filter(ev => {
        const diff = Math.abs(ev.timestamp_epoch - absTime);
        return diff < 3;
      });
      active.forEach((ev: any) => {
        const col = EVENT_COLORS[ev.type as keyof typeof EVENT_COLORS] || "#fff";
        const b = ev.bbox;
        if (!b) return;
        const bx = b.x * W;
        const by = b.y * H;
        const bw = b.w * W;
        const bh = b.h * H;
        ctx.strokeStyle = col;
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        const cs = 14;
        ctx.fillStyle = col;
        [[bx, by], [bx + bw - cs, by], [bx, by + bh - cs], [bx + bw - cs, by + bh - cs]].forEach(([x, y]) => {
          ctx.fillRect(x, y, cs, 2);
          ctx.fillRect(x, y, 2, cs);
        });
        const labelText = `${(ev.type as string).toUpperCase()} · ${ev.confidence}%`;
        ctx.font = "500 11px 'Instrument Sans', sans-serif";
        const tw = ctx.measureText(labelText).width;
        ctx.fillStyle = col;
        ctx.fillRect(bx, by - 20, tw + 12, 20);
        ctx.fillStyle = "#fff";
        ctx.fillText(labelText, bx + 6, by - 6);
      });
      const nearest = filteredEvents.reduce((best: any, ev: any) => {
        const diff = Math.abs(ev.timestamp_epoch - absTime);
        return diff < 3 && diff < (best?.diff ?? Infinity) ? { ev, diff } : best;
      }, null);
      const newId = nearest?.ev?.id ?? null;
      if (newId !== activeEventIdRef.current) {
        activeEventIdRef.current = newId;
        setActiveEventId(newId);
      }
      rafId = requestAnimationFrame(draw);
    };
    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [filteredEvents, loaded, events]);

  useEffect(() => {
    if (!activeEventId || !logRef.current) return;
    const row = logRef.current.querySelector(`[data-event-id="${activeEventId}"]`);
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeEventId]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || !loaded) return;
    playing ? v.pause() : v.play();
  };

  const seek = (secs: number) => {
    if (!loaded || !globalDuration) return;
    const target = Math.max(0, Math.min(globalDuration, globalTime + secs));
    loadSegmentAtGlobalTime(target);
  };

  const findSegmentForGlobalTime = useCallback((t: number) => {
    if (!segments.length) return null;
    let index = segments.findIndex((seg, i) => {
      const nextStart = segments[i + 1]?.startOffset ?? Infinity;
      return t >= seg.startOffset && t < nextStart;
    });
    if (index === -1) index = segments.length - 1;
    return { segment: segments[index], localTime: Math.max(0, t - segments[index].startOffset) };
  }, [segments]);

  const currentDayMinute = useMemo(() => {
    const found = findSegmentForGlobalTime(globalTime);
    return found ? getDayMinutes(found.segment.started_at) + found.localTime / 60 : null;
  }, [globalTime, findSegmentForGlobalTime]);

  const seekToDayMinute = useCallback((minute: number) => {
    if (!segments.length) return;
    const target = Math.max(DAY_START_MINUTES, Math.min(DAY_END_MINUTES, minute));
    for (const block of availableBlocks) {
      if (target >= block.startMinutes && target < block.startMinutes + block.durationSecs / 60) {
        loadSegmentAtGlobalTime(block.startOffset + (target - block.startMinutes) * 60);
        return;
      }
    }
    showAlert("No recording available at this time");
  }, [segments, availableBlocks, loadSegmentAtGlobalTime, showAlert]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!segments.length || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToDayMinute(DAY_START_MINUTES + pct * DAY_SPAN_MINUTES);
  };

  const handleTimelineMouseMove = (e: React.MouseEvent) => {
    if (!segments.length || !timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverTime(DAY_START_MINUTES + pct * DAY_SPAN_MINUTES);
    setHoverX(pct * 100);
  };

  const exportClip = async () => {
    if (!loaded || exportLoading) return;
    const startSec = Math.max(0, currentTime - 30);
    const endSec = Math.min(duration, currentTime + 30);
    setExportLoading(true);
    showAlert("Exporting 60s clip…");
    try {
      const { clip_url } = await apiRequest<{ clip_url: string }>("/playback/export", {
        method: "POST",
        body: JSON.stringify({ camera: selectedCam.id, date: selectedDate, start_sec: startSec, end_sec: endSec }),
      });
      const a = document.createElement("a");
      a.href = `http://localhost:8888${clip_url}`;
      a.download = `clip_cam${selectedCam.id}_${selectedDate}_${Math.floor(startSec)}.mp4`;
      a.click();
      showAlert("Clip downloaded successfully.");
    } catch (err: any) {
      showAlert("Export failed — " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const playedPct = currentDayMinute !== null
    ? ((currentDayMinute - DAY_START_MINUTES) / DAY_SPAN_MINUTES) * 100
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
            <Monitor size={13} className="text-gray-400" />
            <select
              value={selectedCam.id}
              onChange={e => setSelectedCam(CAMERAS.find(c => c.id === parseInt(e.target.value))!)}
              className="text-xs bg-transparent text-gray-700 focus:outline-none cursor-pointer appearance-none pr-1"
            >
              {CAMERAS.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <span className="text-[10px] font-mono font-semibold tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            PLAYBACK
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="text-xs bg-transparent text-gray-700 focus:outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={fetchSegments}
            disabled={loading}
            className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {loading ? "Loading…" : "Load Footage"}
          </button>
        </div>
      </div>

      {/* ── VIDEO AREA ── */}
      <div
        className="relative w-full flex-1 min-h-0 overflow-hidden group"
        onMouseEnter={handleVideoMouseEnter}
        onMouseMove={revealOverlay}
        onMouseLeave={handleVideoMouseLeave}
      >
        <video ref={videoRef} className="absolute inset-0 block w-full h-full object-cover bg-black" playsInline preload="metadata" />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {!hasFootage && !loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-500">
            <Monitor size={40} strokeWidth={1} className="text-gray-400" />
            <span className="text-xs font-mono">Select a date and camera, then Load Footage</span>
          </div>
        )}

        {loading && !hasFootage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono text-blue-400">Connecting to NVR…</span>
          </div>
        )}

        {buffering && hasFootage && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 pointer-events-none">
            <div className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-2 text-xs font-mono text-white shadow-lg">
              <RotateCw size={14} className="animate-spin text-blue-300" />
              Loading segment…
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-mono text-red-400">{error}</span>
          </div>
        )}

        {loaded && (
          <>
            <div className="absolute top-2 left-2 flex flex-col gap-0.5 pointer-events-none">
              <span className="text-[10px] font-mono text-white/70 bg-black/60 px-2 py-0.5 rounded-sm">{selectedCam.label}</span>
              <span className="text-xs font-mono text-white bg-black/70 px-2 py-0.5 rounded-sm">{fmtDuration(currentTime)}</span>
            </div>
            <div className="absolute top-2 right-2 flex items-center gap-1.5 font-mono text-[9px] tracking-widest text-red-400 bg-black/60 px-2 py-0.5 rounded-sm pointer-events-none">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              PLAYBACK
            </div>
            <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-12 pb-3 px-3 transition-opacity duration-200 ${showOverlay ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
              <div className="mb-2">
                <div ref={timelineRef} className="relative h-1.5 cursor-pointer group/timeline" onClick={handleTimelineClick} onMouseMove={handleTimelineMouseMove} onMouseLeave={() => setHoverTime(null)}>
                  <div className="absolute inset-0 bg-white/20 rounded-full" />
                  {availableBlocks.map((block, i) => {
                    const left = ((block.visibleStart - DAY_START_MINUTES) / DAY_SPAN_MINUTES) * 100;
                    const width = ((block.visibleEnd - block.visibleStart) / DAY_SPAN_MINUTES) * 100;
                    return <div key={i} className="absolute inset-y-0 bg-emerald-400/40 rounded-sm" style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }} />;
                  })}
                  <div className="absolute inset-y-0 left-0 bg-blue-400 rounded-full" style={{ width: `${playedPct}%` }} />
                  {filteredEvents.map((ev: any) => {
                    const evDate = new Date(ev.timestamp_epoch * 1000);
                    const evMinute = evDate.getHours() * 60 + evDate.getMinutes();
                    const pct = ((evMinute - DAY_START_MINUTES) / DAY_SPAN_MINUTES) * 100;
                    if (pct < 0 || pct > 100) return null;
                    return <div key={ev.id} title={ev.description} onClick={e => { e.stopPropagation(); seekToDayMinute(evMinute); }} className="absolute top-0 w-0.5 h-full rounded-sm -translate-x-1/2 cursor-pointer hover:scale-y-125 transition-transform z-10" style={{ left: `${pct}%`, background: EVENT_COLORS[ev.type as keyof typeof EVENT_COLORS] || "#fff" }} />;
                  })}
                  {hoverTime !== null && <div className="absolute -top-6 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-mono px-1.5 py-0.5 rounded pointer-events-none z-20 whitespace-nowrap" style={{ left: `${hoverX}%` }}>{fmtClock(hoverTime)}</div>}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={togglePlay} className="p-1 rounded-full hover:bg-white/20 text-white transition-colors">{playing ? <Pause size={18} /> : <Play size={18} />}</button>
              </div>
            </div>
          </>
        )}

        <AlertPopup message={alertMsg} />
      </div>

      {/* ── TIME AVAILABILITY ── */}
      {segments.length > 0 && (
        <div className="px-4 py-2 bg-gray-50/50 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono tracking-widest text-gray-400">
              RECORDINGS · {String(DAY_START_HOUR).padStart(2, "0")}:00 – {String(DAY_END_HOUR).padStart(2, "0")}:00
            </span>
            <span className="text-[10px] font-mono text-emerald-600">{availableBlocks.length} segments</span>
          </div>
          <div className="relative h-6">
            <div className="absolute inset-0 flex rounded-md overflow-hidden bg-gray-200">
              {availableBlocks.map((block, i) => {
                const left = ((block.visibleStart - DAY_START_MINUTES) / DAY_SPAN_MINUTES) * 100;
                const width = ((block.visibleEnd - block.visibleStart) / DAY_SPAN_MINUTES) * 100;
                return (
                  <div
                    key={i}
                    onClick={() => seekToDayMinute(block.visibleStart)}
                    title={`${fmtClock(block.visibleStart)} – ${fmtClock(block.visibleEnd)}`}
                    className="absolute h-full bg-emerald-400 hover:bg-emerald-500 cursor-pointer transition-colors rounded-sm"
                    style={{ left: `${left}%`, width: `${Math.max(width, 0.5)}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[9px] font-mono text-gray-400 mt-0.5">
              <span>{String(DAY_START_HOUR).padStart(2, "0")}:00</span>
              <span>{String(DAY_END_HOUR - 6).padStart(2, "0")}:00</span>
              <span>{String(DAY_END_HOUR).padStart(2, "0")}:00</span>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTROLS ── */}
      <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-50/50 border-t border-gray-200 flex-wrap flex-shrink-0">
        <button onClick={() => seek(-30)} title="Back 30s" className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
          <SkipBack size={14} />
        </button>
        <button onClick={() => seek(-5)} title="Back 5s" className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
          <ChevronRight size={14} className="rotate-180" />
        </button>

        <button
          onClick={togglePlay}
          title="Play / Pause"
          className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>

        <button onClick={() => seek(5)} title="Forward 5s" className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
          <ChevronRight size={14} />
        </button>
        <button onClick={() => seek(30)} title="Forward 30s" className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
          <SkipForward size={14} />
        </button>

        <div className="text-xs font-mono text-gray-500 ml-1 whitespace-nowrap">
          <span className="text-gray-800">{fmtDuration(globalTime)}</span>
          <span className="text-gray-400"> / {fmtDuration(globalDuration)}</span>
        </div>

        <div className="flex items-center gap-1 ml-2">
          {SPEED_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`text-xs font-mono px-2 py-1 rounded-md transition-colors ${
                speed === s ? "bg-blue-500 text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {s}×
            </button>
          ))}
        </div>

        <div className="flex-1" />

        <button
          onClick={() => setMuted(m => !m)}
          title="Mute"
          className={`p-1.5 rounded-lg transition-colors ${muted ? "bg-red-100 text-red-500" : "hover:bg-gray-200 text-gray-500"}`}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>

        <input
          type="range"
          min={0} max={1} step={0.05}
          value={muted ? 0 : volume}
          onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }}
          className="w-16 h-1 accent-blue-500 cursor-pointer"
        />

        <button
          onClick={exportClip}
          title="Export ±30s clip"
          className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors ml-1"
        >
          {exportLoading ? <RotateCw size={14} className="animate-spin" /> : <Download size={14} />}
        </button>
      </div>

      {/* ── FILTER ROW ── */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50/50 border-t border-gray-200 flex-wrap flex-shrink-0">
        <span className="text-[10px] font-mono tracking-widest text-gray-400">FILTER</span>
        {Object.entries(EVENT_COLORS).map(([type, color]) => {
          const on = activeFilters[type as keyof typeof activeFilters];
          return (
            <button
              key={type}
              onClick={() => setActiveFilters(f => ({ ...f, [type]: !f[type as keyof typeof f] }))}
              className="text-[10px] font-mono px-2 py-0.5 rounded transition-all"
              style={{
                background: on ? `${color}18` : "#fff",
                border: `1px solid ${on ? color : "#e5e7eb"}`,
                color: on ? color : "#9ca3af",
              }}
            >
              {type.toUpperCase()}
            </button>
          );
        })}
        <div className="flex-1" />
        <span className="text-[10px] font-mono text-blue-500">{filteredEvents.length} EVENTS</span>
      </div>

      {/* ── EVENT LOG ── */}
      <div className="border-t border-gray-200 bg-white max-h-[160px] overflow-y-auto flex-shrink-0" ref={logRef}>
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 sticky top-0 bg-white z-10">
          <span className="text-[10px] font-mono tracking-widest text-gray-400">
            DETECTION LOG — {selectedDate} · {selectedCam.label}
          </span>
          <span className="text-[10px] font-mono text-blue-500">{filteredEvents.length} events</span>
        </div>

        {filteredEvents.length === 0 && (
          <div className="py-5 text-center text-[11px] font-mono text-gray-400">
            {loaded ? "No events match current filters" : "Load footage to see detection events"}
          </div>
        )}

        {filteredEvents
          .sort((a: any, b: any) => a.timestamp_epoch - b.timestamp_epoch)
          .map((ev: any) => {
            const isActive = ev.id === activeEventId;
            return (
              <div
                key={ev.id}
                data-event-id={ev.id}
                onClick={() => {
                  const evDate = new Date(ev.timestamp_epoch * 1000);
                  seekToDayMinute(evDate.getHours() * 60 + evDate.getMinutes());
                  showAlert(`${EVENT_LABELS[ev.type as keyof typeof EVENT_LABELS]}: ${ev.description}`);
                }}
                className={`flex items-center gap-2.5 px-4 py-1.5 border-b border-gray-50 cursor-pointer transition-colors ${
                  isActive ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: EVENT_COLORS[ev.type as keyof typeof EVENT_COLORS] }}
                />
                <span className="text-[10px] font-mono text-gray-400 min-w-[60px]">
                  {ev.timestamp_clock || epochToClockStr(ev.timestamp_epoch)}
                </span>
                <span className="text-xs text-gray-600 flex-1 truncate">{ev.description}</span>
                <span className="text-[10px] font-mono text-gray-400">{ev.confidence}%</span>
                <span className="text-[10px] font-mono text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  → JUMP
                </span>
              </div>
            );
          })}
      </div>
    </div>
  );
}