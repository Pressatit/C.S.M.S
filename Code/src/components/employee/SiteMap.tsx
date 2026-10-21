import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

export interface MapZone {
    id: string
    label: string
    color: string
    border: string
    active: boolean
}

export interface MapEmployee {
    id: string
    name: string
    role: string
    zone: string
    x: number  // strictly 0-1000
    y: number  // strictly 0-750
}

interface SiteLiveMapProps {
    zones: MapZone[]
    employees: MapEmployee[]
    roleColors: Record<string, string>
}

// 📐 Explicit Map Dimensions based on a flat pixel grid
const MAP_WIDTH = 845
const MAP_HEIGHT = 600

// 🗺️ Asset Registry mapping out custom image files
const SITE_IMAGES = {
    overview: "/zones/Site Aerial.png", 
    zoneA:     "/zones/Zone A.png",     
    zoneB: "/zones/Zone B.png",
    zoneC:   "/zones/Zone C.png",
    zoneD:  "/zones/Zone D.png",
    office:    "/zones/Site Office.png",
    entrance:   "/zones/Entrance.png",
}

// 🟩 Match exact Parent IDs to the visual layout [xmin, xmax, ymin, ymax]
const ZONE_RECTS: Record<string, [number, number, number, number]> = {
    zoneA:    [0,   330,  350, 595], // Top-left
    zoneD:    [330, 545,  350, 595], // Top-center
    zoneC:    [545, 1000, 350, 595], // Top-right
    office:   [0,   160,  160, 350], // Mid-left
    entrance: [0,   297,  0,   160], // Bottom-left
    zoneB:    [160, 1000, 0,   350], // Giant center/bottom-right field
}

export function SiteLiveMap({ zones, employees, roleColors }: SiteLiveMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [activeZone, setActiveZone] = useState<string>("") 

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        // 📏 Map bounds dictate the exact size of the image
        const mapBounds = L.latLngBounds([[0, 0], [MAP_HEIGHT, MAP_WIDTH]])

        // 1. Build Canvas
        const map = L.map(container, {
            crs: L.CRS.Simple, 
            maxBounds: mapBounds,     
            maxBoundsViscosity: 1.0,      
            zoomControl: true,
            attributionControl: false,
        })

        // 2. Apply Image (It will now perfectly match the 1000x750 polygons)
        const currentImageUrl = activeZone 
            ? (SITE_IMAGES[activeZone as keyof typeof SITE_IMAGES] ?? SITE_IMAGES.overview)
            : SITE_IMAGES.overview

        L.imageOverlay(currentImageUrl, mapBounds).addTo(map)

        // 3. Draw Polygons
        if (activeZone === "") {
            zones.forEach(z => {
                const rect = ZONE_RECTS[z.id]
                if (!rect) return
                const [xmin, xmax, ymin, ymax] = rect

                const corners: [number, number][] = [
                    [ymin, xmin],
                    [ymin, xmax],
                    [ymax, xmax],
                    [ymax, xmin],
                ]

                const poly = L.polygon(corners, {
                    color: z.border || "#4A5568",
                    weight: 2,
                    fillColor: z.color || "#CBD5E0",
                    fillOpacity: z.active ? 0.35 : 0.15,
                }).addTo(map)

                poly.bindTooltip(z.label, { direction: "center", permanent: false })

                poly.on("click", () => {
                    setActiveZone(z.id)
                })
            })
        }

        // 4. Render Beacons
        const filteredEmployees = activeZone 
            ? employees.filter(e => e.zone === activeZone) 
            : employees

        filteredEmployees.forEach(e => {
            const color = roleColors[e.role] ?? "#4A5568"
            const pinPosition: [number, number] = [e.y, e.x]

            L.circleMarker(pinPosition, {
                radius: 7,
                color: "#ffffff",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
            })
                .addTo(map)
                .bindTooltip(`<b>${e.name}</b><br/><span style="font-size:10px">${e.role}</span>`, { 
                    offset: [0, -10],
                    direction: "top"
                })
        })

        // 5. Fit the map to the image, then lock the zoom so users cannot see the grey void
        map.fitBounds(mapBounds)
        map.setMinZoom(map.getBoundsZoom(mapBounds))

        const observer = new ResizeObserver(() => map.invalidateSize())
        observer.observe(container)

        return () => {
            observer.disconnect()
            map.remove()
        }
    }, [zones, employees, roleColors, activeZone])

    return (
        <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-between items-center bg-white border border-gray-200 px-4 py-2 rounded-lg">
                <span className="text-sm text-gray-500 font-medium">
                    📍 Location View: <b className="text-gray-900">{activeZone ? `Murang'a Site — ${activeZone.toUpperCase()}` : "Full Site Overview"}</b>
                </span>
                {activeZone && (
                    <button 
                        onClick={() => setActiveZone("")}
                        className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded transition shadow"
                    >
                        ← Back to Full Map
                    </button>
                )}
            </div>

            {/* Changed from hardcoded h-[500px] to aspect-[4/3] to shape the div exactly to the image */}
            <div 
                ref={containerRef} 
                className="z-0 isolate w-full aspect-[4/3] max-h-[600px] rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-[#e5e7eb] cursor-pointer" 
            />
        </div>
    )
}