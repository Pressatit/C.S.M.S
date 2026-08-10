


const MEDIA_BASE="http://localhost:8888"
const WS_BASE = "ws://localhost:8000"


export const cameras=[
    {
      id:1,
      label:"CAMERA_1",
      protocol:"WebRTC" as const,
      streamUrl: "cam1",
      wsBaseUrl: WS_BASE

    },
    {
        id:2,
        label:"CAMERA_2",
        protocol:"WebRTC" as const,
        streamUrl:"cam2",
        wsBaseUrl: WS_BASE
    },
    {
     id:3,
     label:"CAMERA_3",
     protocol:"WebRTC" as const,
     streamUrl:"cam3",
     wsBaseUrl: WS_BASE
    },
    {
      id:4,
      label:"CAMERA_4",
      protocol:"WebRTC" as const,
      streamUrl:`cam4`,
      wsBaseUrl: WS_BASE
    },
    {
      id:5,
      label:"CAMERA_5",
      protocol:"HLS" as const,
      streamUrl:`${MEDIA_BASE}/cam4/index.m3u8`,
      wsBaseUrl: WS_BASE
    }
    

]

