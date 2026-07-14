import { useEffect, useRef } from "react";
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
}

export function CameraCell({ id, label, streamUrl, protocol, isExpanded, onClick, onClose }: CameraCellProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);

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

            {/* Your Original Visual Layer: Unchanged */}
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs font-mono px-2 py-1 rounded">
                {label}
            </div>

            <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600/80 text-white text-xs font-medium px-2 py-1 rounded">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
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