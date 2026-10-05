import { useEffect, useRef } from "react"
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
    x: number
    y: number
}

interface SiteLiveMapProps {
    zones: MapZone[]
    employees: MapEmployee[]
    roleColors: Record<string, string>
}

// Site centre (dummy — Nairobi) and meter→degree conversion
const CENTER = { lat: -1.2865, lng: 36.821 }
const M_PER_LAT = 1 / 111320
const M_PER_LNG = 1 / (111320 * Math.cos((CENTER.lat * Math.PI) / 180))

// Zone footprints in metres, origin = site centre, x east+, y north+
const SITE_HALF_WIDTH = 120
const SITE_HALF_HEIGHT = 100

const ZONE_RECTS: Record<string, [number, number, number, number]> = {
    admin:    [-SITE_HALF_WIDTH, -40,              0, SITE_HALF_HEIGHT],
    blockA:   [-40,              40,               0, SITE_HALF_HEIGHT],
    blockB:   [40,               SITE_HALF_WIDTH,  0, SITE_HALF_HEIGHT],
    yard:     [-SITE_HALF_WIDTH, -40,              -SITE_HALF_HEIGHT, 0],
    parking:  [-40,              40,               -SITE_HALF_HEIGHT, 0],
    entrance: [40,               SITE_HALF_WIDTH,  -SITE_HALF_HEIGHT, 0],
}

export function SiteLiveMap({ zones, employees, roleColors }: SiteLiveMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)

    const toLatLng = (x: number, y: number): [number, number] => [
        CENTER.lat + y * M_PER_LAT,
        CENTER.lng + x * M_PER_LNG,
    ]

    useEffect(() => {
        const container = containerRef.current
        if (!container) return

        const map = L.map(container, {
            center: [CENTER.lat, CENTER.lng],
            zoom: 17,
            zoomControl: true,
            attributionControl: true,
        })

        L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                attribution:
                    "Imagery &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
                maxZoom: 19,
            }
        ).addTo(map)

        // Site boundary
        const siteCorners: [number, number][] = [
            [-SITE_HALF_WIDTH, -SITE_HALF_HEIGHT],
            [SITE_HALF_WIDTH, -SITE_HALF_HEIGHT],
            [SITE_HALF_WIDTH, SITE_HALF_HEIGHT],
            [-SITE_HALF_WIDTH, SITE_HALF_HEIGHT],
        ].map(([x, y]) => toLatLng(x, y))
        L.polygon(siteCorners, {
            color: "#ffffff",
            weight: 2,
            fill: false,
            dashArray: "6 4",
            interactive: false,
        }).addTo(map)

        // Zone polygons
        zones.forEach(z => {
            const [xmin, xmax, ymin, ymax] = ZONE_RECTS[z.id] ?? ZONE_RECTS.blockA
            const corners: [number, number][] = [
                [xmin, ymin],
                [xmax, ymin],
                [xmax, ymax],
                [xmin, ymax],
            ].map(([x, y]) => toLatLng(x, y))

            const poly = L.polygon(corners, {
                color: z.border,
                weight: 2,
                fillColor: z.color,
                fillOpacity: z.active ? 0.55 : 0.25,
                interactive: false,
            }).addTo(map)

            poly.bindTooltip(`${z.label}${z.active ? "" : " — inactive"}`, {
                direction: "center",
            })
        })

        // Employee beacons
        employees.forEach(e => {
            const color = roleColors[e.role] ?? "#000"
            L.circleMarker(toLatLng(e.x, e.y), {
                radius: 8,
                color: "#ffffff",
                weight: 2,
                fillColor: color,
                fillOpacity: 1,
            })
                .addTo(map)
                .bindTooltip(`<b>${e.name}</b> · ${e.role}`, { offset: [0, -12] })
        })

        // Fit view to the site footprint
        map.fitBounds(
            L.latLngBounds([
                [CENTER.lat - SITE_HALF_HEIGHT * M_PER_LAT, CENTER.lng - SITE_HALF_WIDTH * M_PER_LNG],
                [CENTER.lat + SITE_HALF_HEIGHT * M_PER_LAT, CENTER.lng + SITE_HALF_WIDTH * M_PER_LNG],
            ]),
            { padding: [28, 28] }
        )

        const observer = new ResizeObserver(() => map.invalidateSize())
        observer.observe(container)

        return () => {
            observer.disconnect()
            map.remove()
        }
    }, [zones, employees, roleColors])

    return (
        <div ref={containerRef} className="z-0 isolate h-[420px] md:h-[480px] w-full rounded-lg overflow-hidden" />
    )
}