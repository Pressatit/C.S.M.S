export type EventType = "ppe" | "Machinery" |"Personnel"

export interface BoundingBox{
    x:number,y:number,w:number,h:number
}

export interface DetectionEvent{
    id : number,
    cameraId : number,
    type : EventType,
    confidence : number,
    timestamp_epoch : number, //unix timestamp of the frame 
    timestamp_clock: number,
    Session_start_epoch : number, //unix timestamp of the start of the session
    bbox :BoundingBox | null
}

export function Liveview(){
    return(
        <div className="p-6">
            <h1 className="text-xl font-semibold text-gray-800 mb-1" >Live View</h1>
            <p className= "text-sm text-gray-500" >Real-time camera detection with AI detection overlay</p>
            <div className ="mt-6 grid grid-cols-3 gap-3">
                {["Camera 1","Camera 2","Camera 3","Camera 4","Camera 5","Camera 6"].map(cam =>(<div key={cam}className="bg-black rounded-lg aspect-video flex items-center justify-center">
                    <span className="text-gray-500 text-sm">{cam}</span>
                    </div>
                    ))}
            </div>
        </div>
    )
}


