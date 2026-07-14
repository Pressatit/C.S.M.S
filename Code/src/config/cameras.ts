
const MEDIA_BASE="http://localhost:8888"

export const cameras=[
    {
      id:1,
      label:"CAMERA_1",
      protocol:"HLS" as const,
      streamUrl: `${MEDIA_BASE}/cam1/index.m3u8`
    },
    {
        id:2,
        label:"CAMERA_2",
        protocol:"WebRTC" as const,
        streamUrl:"cam2"
    },
    {
     id:3,
     label:"CAMERA_3",
     protocol:"HLS" as const,
     streamUrl:`${MEDIA_BASE}/cam3/index.m3u8`
    },
    {
      id:4,
      label:"CAMERA_4",
      protocol:"WebRTC" as const,
      streamUrl:`cam4`
    },
    {
      id:5,
      label:"CAMERA_5",
      protocol:"HLS" as const,
      streamUrl:`${MEDIA_BASE}/cam4/index.m3u8`
    }
    

]

