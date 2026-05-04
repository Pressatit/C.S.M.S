
import { useState } from "react"
import {CameraCell} from "../components/live/cameraCell"

import { cameras } from "../config/cameras"

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
    const[expandedId,setExpandedId]=useState<number |null>(null)
    
    const expandedCamera = cameras.find(c => c.id === expandedId)
    const otherCameras = cameras.filter(c => c.id !== expandedId)


    return (
    <div className="h-full flex flex-col p-3 md:p-4 gap-3">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-800">
            Live View
          </h1>
          <p className="text-xs text-gray-500">
            {cameras.length} cameras · All online
          </p>
        </div>
        {expandedId && (
          <button
            onClick={() => setExpandedId(null)}
            className="text-xs text-gray-500 hover:text-gray-800
                       px-3 py-1.5 border border-gray-200 rounded-lg
                       transition-colors"
          >
            ← Back to grid
          </button>
        )}
      </div>

      {/* ── Camera layout ── */}
      <div className="flex-1 min-h-0">

        {/* EXPANDED VIEW — one big camera + others in sidebar */}
        {expandedId && expandedCamera ? (
          <div className="
            h-full flex flex-col lg:flex-row gap-2
          ">
            {/* Main expanded camera — 3/4 width on desktop */}
            <div className="
              flex-1 lg:w-3/4 lg:flex-none
              min-h-0
            ">
              <CameraCell
                {...expandedCamera}
                isExpanded={true}
                onClick={() => {}}
                onClose={() => setExpandedId(null)}
              />
            </div>

            {/* Other cameras — sidebar on desktop, row on mobile */}
            <div className="
              flex lg:flex-col gap-2
              lg:w-1/4 lg:flex-none
              overflow-x-auto lg:overflow-x-hidden
              lg:overflow-y-auto
            ">
              {otherCameras.map(camera => (
                <div
                  key={camera.id}
                  className="
                    flex-shrink-0
                    w-40 h-24
                    lg:w-full lg:h-auto lg:aspect-video
                  "
                >
                  <CameraCell
                    {...camera}
                    isExpanded={false}
                    onClick={() => setExpandedId(camera.id)}
                    onClose={() => setExpandedId(null)}
                  />
                </div>
              ))}
            </div>
          </div>

        ) : (
          /* GRID VIEW — all cameras equal size */
          <div className="
            h-full
            grid gap-2
            grid-cols-1
            sm:grid-cols-2
            lg:grid-cols-3
            auto-rows-fr
          ">
            {cameras.map(camera => (
              <div key={camera.id} className="min-h-0 aspect-video">
                <CameraCell
                  {...camera}
                  isExpanded={false}
                  onClick={() => setExpandedId(camera.id)}
                  onClose={() => setExpandedId(null)}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}


