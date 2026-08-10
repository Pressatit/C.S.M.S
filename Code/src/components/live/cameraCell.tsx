import { useCallback, useEffect, useRef } from "react";
import Hls from "hls.js";
import { Maximize2 } from "lucide-react";
import { WebRtcVideoPlayer } from "./WebrtcCameracell"; // Import the clean engine

interface CameraCellProps {
    id: number;
    label: string;
    streamUrl: string;
    protocol: "HLS" | "WebRTC"; // Added to verify stream configuration type
    isExpanded: boolean;
    onClick: () => void;
    onClose: () => void;
    wsBaseUrl?: string;

}
interface Bbox{
    x:number;
    y:number;
    w:number;
    h:number;
}

interface Detection{
    event_type:string;
    confidence:number;
    tracking_id :number | null;
    bbox:Bbox;

}

interface DetectionPayload{
    camera_id:number;
    frame_timestamp:number;
    detections:Detection[];
}

const EVENT_COLOURS: Record<string, string> = {
    no_hard_hat:    "#e24b4a",  // red — violation
    no_safety_vest: "#e24b4a",  // red — violation
    person:         "#4a7ab5",  // blue — neutral
    excavator:      "#EF9F27",  // amber — machinery
    bulldozer:      "#EF9F27",
    dump_truck:     "#EF9F27",
    grader:         "#EF9F27",
    roller:         "#EF9F27",
    backhoe:        "#EF9F27",
    mixer:          "#EF9F27",
    crane:          "#EF9F27",
    loader:         "#EF9F27",
    water_truck:    "#EF9F27",
    pickup_truck:   "#EF9F27",
};

export function CameraCell({ id, label, streamUrl, protocol, isExpanded, onClick, onClose, wsBaseUrl="ws://localhost:8000" }: CameraCellProps) {
    
    //Using useRef() to store data without forcing a rerender of the browser
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef   = useRef<HTMLCanvasElement>(null);
    const wsRef       = useRef<WebSocket | null>(null);
    const detectionsRef = useRef<Detection[]>([]);
    const animFrameRef  = useRef<number>(0);
    const hlsRef = useRef<Hls | null>(null);
    const staleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);



    //draw boxes on canvas
    const drawBoxes =useCallback(()=>{
        const canvas=canvasRef.current
        if(!canvas) return;

        //Getting client's display size
        const rect=canvas.getBoundingClientRect();
        canvas.width=rect.width
        canvas.height=rect.height
        
        const ctx=canvas.getContext("2d")
        if(!ctx) return;
        ctx.clearRect(0,0,canvas.width,canvas.height);

        const W=canvas.width;
        const H=canvas.height;

        detectionsRef.current.forEach(det =>{
            const { x, y, w, h } = det.bbox;
            const color =EVENT_COLOURS[det.event_type]

            //Convert normalized coordinates to canvas sze
            const px = x * W;
            const py = y * H;
            const pw = w * W;
            const ph = h * H;

            //Bounding box
            ctx.strokeStyle = color;
            ctx.lineWidth   = 2;
            ctx.strokeRect(px, py, pw, ph);

            // Corner accents — more visible than a plain rectangle
            const cs = 10;
            ctx.fillStyle = color;
            [[px, py], [px+pw-cs, py], [px, py+ph-cs], [px+pw-cs, py+ph-cs]]
                .forEach(([bx, by]) => {
                    ctx.fillRect(bx,    by,    cs, 2);
                    ctx.fillRect(bx,    by,    2,  cs);
                });

            const label = `${det.event_type} ${Math.round(det.confidence * 100)}%`;
            ctx.font      = "bold 11px monospace";
            const tw      = ctx.measureText(label).width;
            ctx.fillStyle = color;
            ctx.fillRect(px, py - 18, tw + 10, 18);
            ctx.fillStyle = "#fff";
            ctx.fillText(label, px + 5, py - 5);
            

         });
    
    animFrameRef.current=requestAnimationFrame(drawBoxes)
    }, []);

    
    //  WebSocket connection to  camera
    useEffect(() => {
        const ws = new WebSocket(`${wsBaseUrl}/ws/live/${id}`);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log(`WS connected: camera ${id}`);
        };

        ws.onmessage = (event) => {
            try {
                const payload: DetectionPayload = JSON.parse(event.data);
                // Update detections ref — canvas draw loop reads this
                detectionsRef.current = payload.detections;

                if (staleTimeoutRef.current) {
                   clearTimeout(staleTimeoutRef.current);}

                staleTimeoutRef.current = setTimeout(() => {detectionsRef.current = [];}, 500);
            } catch {
                // malformed JSON — ignore
            }
        };

        ws.onclose = () => {
            console.log(`WS closed: camera ${id}`);
        };

        ws.onerror = (err) => {
            console.error(`WS error camera ${id}:`, err);
        };

        // Start canvas draw loop
        animFrameRef.current = requestAnimationFrame(drawBoxes);

        return () => {
            ws.close();

            if (staleTimeoutRef.current) {
                  clearTimeout(staleTimeoutRef.current);
            }

            cancelAnimationFrame(animFrameRef.current);
        };
    }, [id, wsBaseUrl, drawBoxes]);



    useEffect(() => {
        // Only run HLS configuration if the camera is explicitly set to HLS
        if (protocol !== "HLS") return;

        const video = videoRef.current;
        if (!video) return;

        if (hlsRef.current) {
            hlsRef.current.destroy();
        }

        if (Hls.isSupported()) {
            const hls = new Hls({
                lowLatencyMode: true,
                backBufferLength: 10,
                maxBufferLength: 5,
            });
            hlsRef.current = hls;
            hls.loadSource(streamUrl);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(() => {});
            });
        } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = streamUrl;
            video.play().catch(() => {});
        }

        return () => {
            hlsRef.current?.destroy();
        };
    }, [streamUrl, protocol]);

    return (
        <div 
            className={`relative bg-black rounded-lg overflow-hidden cursor-pointer group transition-all duration-300 ease-in-out w-full h-full ${
                isExpanded ? "ring-2 ring-blue-500" : "hover:ring-1 hover:ring-gray-500"
            }`}
            onClick={!isExpanded ? onClick : undefined}
        >
            {/* inner streaming element switch based purely on protocol configuration */}
            {protocol === "WebRTC" ? (
                <WebRtcVideoPlayer streamName={streamUrl} />
            ) : (
                <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
            )}

            {/* ── Canvas overlay — sits above video, passes clicks through ── */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ pointerEvents: "none" }}
            />

            {/*  Visual Layer: */}
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-mono px-2 py-1 rounded">
                {label}
            </div>

            <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600/80 text-white text-xs font-medium px-2 py-1 rounded">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                LIVE
            </div>

            {!isExpanded && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClick(); }} 
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                >
                    <Maximize2 size={14} /> 
                </button>
            )}
            
            {isExpanded && (
                <button 
                    onClick={(e) => { e.stopPropagation(); onClose(); }} 
                    className="absolute bottom-2 right-2 bg-black/60 hover:bg-red-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors duration-150"
                >
                    Close ✕
                </button> 
            )}
        </div>
    );
}