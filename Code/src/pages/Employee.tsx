import { useState } from "react"
import { Users, MapPin, ClipboardList, FileText, Clock } from "lucide-react"
import { SiteLiveMap } from "../components/employee/SiteLiveMap"
import { DailyAttendance } from "../components/employee/DailyAttendance"

export interface employee{
    id : number,
    employee_id: string,
    First_name: string,
    Surname : string,
    role : string,
    id_number :string,
    phone_number : string,
    ble_uuid: number

} 

export interface AttendanceRecord{
    id : number,
    employee_id: string,
    First_name: string,
    Surname : string,
    role : string,
    id_number :string,
    phone_number : string,
    time_in :string |null,
    time_out : string | null,
    attendance: "Present" | "Absent"
}

export interface BLePosition{
    id :number,
    ble_uuid: number,
    employee_id: string,
    x_meters:number,
    y_meters:number,
    zone:string,
    timestamp_epoch : number, 
}

const SITE_ROLES = [
    { label: "Managers",      count: 6 },
    { label: "Masons",        count: 24 },
    { label: "Carpenters",    count: 18 },
    { label: "IT Admin",      count: 4 },
    { label: "Plumbers",      count: 12 },
    { label: "Site Clerks",   count: 8 },
    { label: "Safety Officers", count: 10 },
    { label: "Drivers",       count: 15 },
    { label: "Electricians",  count: 14 },
]

const TOTAL_EMPLOYEES = SITE_ROLES.reduce((sum, r) => sum + r.count, 0)

const TABS = [
    { id: "employees",   label: "Site Employees and Roles", icon: Users },
    { id: "location",    label: "Onsite Live Location",      icon: MapPin },
    { id: "attendance",  label: "Daily Attendance",          icon: ClipboardList },
    { id: "report",      label: "Report",                    icon: FileText },
] as const

type TabId = typeof TABS[number]["id"]

interface Zone {
    id: string
    label: string
    color: string
    border: string
    active: boolean
}

const ZONES: Zone[] = [
    { id: "admin",     label: "Admin Block",   color: "#dbeafe", border: "#93c5fd", active: true },
    { id: "blockA",    label: "Block A",       color: "#fef3c7", border: "#fcd34d", active: true },
    { id: "blockB",    label: "Block B",       color: "#fce7f3", border: "#f9a8d4", active: true },
    { id: "yard",      label: "Material Yard", color: "#d1fae5", border: "#6ee7b7", active: true },
    { id: "parking",   label: "Parking",       color: "#e0e7ff", border: "#a5b4fc", active: false },
    { id: "entrance",  label: "Entrance",      color: "#f3e8ff", border: "#d8b4fe", active: false },
]

const BEACON_ROLE_COLORS: Record<string, string> = {
    "Manager":        "#3b82f6",
    "Mason":          "#f59e0b",
    "Carpenter":      "#8b5cf6",
    "IT Admin":       "#06b6d4",
    "Plumber":        "#ef4444",
    "Site Clerk":     "#10b981",
    "Safety Officer": "#f97316",
    "Driver":         "#6366f1",
    "Electrician":    "#eab308",
}

// x/y are metre offsets from the site centre (see SiteLiveMap)
const ON_SITE_EMPLOYEES = [
    { id: "EMP-001", name: "John Mwangi",     role: "Manager",        zone: "admin",    x: -80, y: 55 },
    { id: "EMP-014", name: "Peter Kariuki",   role: "Mason",          zone: "blockA",   x: 0,   y: 60 },
    { id: "EMP-032", name: "Alice Wanjiru",   role: "Plumber",        zone: "blockB",   x: 70,  y: 40 },
    { id: "EMP-057", name: "Grace Nyambura",  role: "Safety Officer", zone: "yard",     x: -85, y: -50 },
]

const ACTIVE_ZONE_COUNT = ZONES.filter(z => z.active).length
const ON_SITE_ROLES = Array.from(new Set(ON_SITE_EMPLOYEES.map(e => e.role)))

export function EmployeeManagement(){
    const [activeTab, setActiveTab] = useState<TabId>("employees")
    const lastUpdated = new Date().toLocaleTimeString()

    return(
        <div className="p-6 flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-800 mb-1">Employee Management</h1>
                <p className="text-sm text-gray-500">Site employee records, attendance and BLE tracking</p>
            </div>

            {/* ── Tabs ── */}
            <div className="flex flex-wrap gap-1 border-b border-gray-200">
                {TABS.map(tab => {
                    const Icon = tab.icon
                    const active = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                                active
                                    ? "text-blue-600 border-blue-600"
                                    : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
                            }`}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    )
                })}
            </div>

            {/* ── Tab panels ── */}
            {activeTab === "employees" && (
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Total employees registered */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <p className="text-sm text-gray-500">Total Employees Registered</p>
                                <p className="text-xs text-gray-400">Registered to site</p>
                            </div>
                            <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                                <Users size={20} className="text-sky-600" />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-gray-800">{TOTAL_EMPLOYEES}</p>
                    </div>

                    {/* Total site roles */}
                    <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm text-gray-500">Total Site Roles</p>
                            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                                {SITE_ROLES.length} roles
                            </span>
                        </div>
                        <div className="space-y-2">
                            {SITE_ROLES.map(role => (
                                <div key={role.label} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                                    <span className="text-sm text-gray-600">{role.label}</span>
                                    <span className="text-sm font-semibold text-gray-800 tabular-nums">{role.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "location" && (
                <div className="flex flex-col gap-4">
                    {/* ── Stats cards ── */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        {/* Employees on site */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-gray-500">Employees On Site</p>
                                <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
                                    <Users size={20} className="text-sky-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">
                                {ON_SITE_EMPLOYEES.length}
                                <span className="text-base font-medium text-gray-400"> out of {TOTAL_EMPLOYEES}</span>
                            </p>
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {ON_SITE_EMPLOYEES.map(e => (
                                    <span key={e.id} className="flex items-center gap-1.5 text-[11px] bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                                        <span className="w-2 h-2 rounded-full" style={{ background: BEACON_ROLE_COLORS[e.role] }} />
                                        {e.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Active zones */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <p className="text-sm text-gray-500">Active Zones</p>
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <MapPin size={20} className="text-indigo-600" />
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-gray-800">
                                {ACTIVE_ZONE_COUNT}
                                <span className="text-base font-medium text-gray-400"> of {ZONES.length} zones</span>
                            </p>
                            <div className="mt-4 flex flex-wrap gap-1.5">
                                {ZONES.map(z => (
                                    <span
                                        key={z.id}
                                        title={z.label}
                                        className="w-3.5 h-3.5 rounded-sm border"
                                        style={{ background: z.color, borderColor: z.border, opacity: z.active ? 1 : 0.4 }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ── Last updated ── */}
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={14} />
                        Last updated <span className="text-gray-600 font-medium">{lastUpdated}</span>
                    </div>

                    {/* ── Sitemap ── */}
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-semibold text-gray-800">Sitemap — Live Locations</h2>
                            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                                {ON_SITE_EMPLOYEES.length} beacons · {ACTIVE_ZONE_COUNT} active zones
                            </span>
                        </div>

                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Map */}
                            <div className="flex-1 min-w-0">
                                <SiteLiveMap
                                    zones={ZONES}
                                    employees={ON_SITE_EMPLOYEES}
                                    roleColors={BEACON_ROLE_COLORS}
                                />
                            </div>

                            {/* ── Keys ── */}
                            <div className="lg:w-60 flex-shrink-0 grid grid-cols-2 lg:grid-cols-1 gap-5 content-start">
                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">
                                        Zone Key
                                    </p>
                                    <div className="space-y-2">
                                        {ZONES.map(z => (
                                            <div key={z.id} className="flex items-center gap-2 text-xs text-gray-600">
                                                <span className="w-4 h-4 rounded-sm border flex-shrink-0" style={{ background: z.color, borderColor: z.border }} />
                                                <span className="flex-1">{z.label}</span>
                                                <span className={`text-[9px] font-mono uppercase ${z.active ? "text-emerald-600" : "text-gray-400"}`}>
                                                    {z.active ? "Active" : "Inactive"}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-400 mb-3">
                                        Employee Key
                                    </p>
                                    <div className="space-y-2">
                                        {ON_SITE_ROLES.map(role => (
                                            <div key={role} className="flex items-center gap-2 text-xs text-gray-600">
                                                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: BEACON_ROLE_COLORS[role] }} />
                                                {role}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === "attendance" && (
                <DailyAttendance />
            )}

            {activeTab === "report" && (
                <div className="bg-gray-100 rounded-xl h-64 flex items-center justify-center">
                    <span className="text-gray-400 text-sm">Report panel loads here</span>
                </div>
            )}
        </div>
    )
}