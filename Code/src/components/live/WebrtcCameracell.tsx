import { useEffect, useRef } from "react";

interface WebRtcVideoPlayerProps {
  streamName: string;
}

export function WebRtcVideoPlayer({ streamName }: WebRtcVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    async function startStream() {
      if (!videoRef.current) return;

      const pc = new RTCPeerConnection({
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
      });
      pcRef.current = pc;

      pc.ontrack = (event) => {
        if (videoRef.current && videoRef.current.srcObject !== event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
        }
      };

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Uses your explicit paths: http://localhost:8889/cam1/whep, /cam2/whep, etc.
        const response = await fetch(`http://localhost:8889/${streamName}/whep`, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: pc.localDescription?.sdp
        });

        if (!response.ok) return;

        const answerSdp = await response.text();
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }));
      } catch (err) {
        console.error("WebRTC Handshake Error:", err);
      }
    }

    startStream();

    return () => {
      pcRef.current?.close();
    };
  }, [streamName]);

  return (
    <video 
      ref={videoRef} 
      className="w-full h-full object-cover" 
      playsInline 
      autoPlay 
    />
  );
}