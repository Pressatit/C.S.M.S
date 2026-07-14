export async function startWebRtcStream(videoElement: HTMLVideoElement, streamName: string) {
  // 1. Create the Peer Connection
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }] // Standard free STUN server
  });

  // 2. Map incoming tracks to the HTML Video element
  pc.ontrack = (event) => {
    if (videoElement.srcObject !== event.streams[0]) {
      videoElement.srcObject = event.streams[0];
    }
  };

  // 3. Request both Video and Audio directions from MediaMTX
  pc.addTransceiver("video", { direction: "recvonly" });
  pc.addTransceiver("audio", { direction: "recvonly" });

  // 4. Create local SDP Offer
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // 5. Post Offer to MediaMTX's WHEP endpoint (Port 8889)
  const response = await fetch(`http://localhost:8889/live/${streamName}/whep`, {
    method: "POST",
    headers: { "Content-Type": "application/sdp" },
    body: pc.localDescription?.sdp
  });

  if (!response.ok) {
    throw new Error(`MediaMTX WebRTC handshake failed: ${response.statusText}`);
  }

  // 6. Receive SDP Answer from MediaMTX and apply it locally
  const answerSdp = await response.text();
  await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answerSdp }));

  return pc; // Return to allow clean teardown when component unmounts
}