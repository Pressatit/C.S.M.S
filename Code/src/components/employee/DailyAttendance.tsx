import { useMemo, useState } from "react"
import {
    Search, CalendarDays, Download, UserCheck, UserX, Users, ChevronRight,
} from "lucide-react"

interface AttendanceRow {
    id: number
    name: string
    role: string
    timeIn: string | null
    timeOut: string | null
    status: "Present" | "Absent"
    date: string
}

const TODAY = "2026-09-17"

const ATTENDANCE_ROWS: AttendanceRow[] = [
    { id: 1,  name: "John Mwangi",      role: "Manager",        timeIn: "06:42", timeOut: "17:05", status: "Present", date: "2026-09-17" },
    { id: 2,  name: "Peter Kariuki",    role: "Mason",          timeIn: "07:10", timeOut: "16:55", status: "Present", date: "2026-09-17" },
    { id: 3,  name: "Alice Wanjiru",    role: "Plumber",        timeIn: "07:25", timeOut: "16:40", status: "Present", date: "2026-09-17" },
    { id: 4,  name: "Grace Nyambura",   role: "Safety Officer", timeIn: "06:55", timeOut: "17:20", status: "Present", date: "2026-09-17" },
    { id: 5,  name: "Kelvin Kiprop",    role: "Mason",          timeIn: "07:32", timeOut: "16:48", status: "Present", date: "2026-09-17" },
    { id: 6,  name: "Sonia Wambui",     role: "Electrician",    timeIn: "07:15", timeOut: "16:50", status: "Present", date: "2026-09-17" },
    { id: 7,  name: "Dennis Mureithi",  role: "Carpenter",      timeIn: "07:02", timeOut: "16:47", status: "Present", date: "2026-09-17" },
    { id: 8,  name: "Mary Njoki",       role: "Site Clerk",     timeIn: "07:20", timeOut: "17:05", status: "Present", date: "2026-09-17" },
    { id: 9,  name: "Brian Otieno",     role: "Driver",         timeIn: null,   timeOut: null,   status: "Absent",  date: "2026-09-17" },
    { id: 10, name: "Ruth Achieng",     role: "Site Clerk",     timeIn: null,   timeOut: null,   status: "Absent",  date: "2026-09-17" },
    { id: 11, name: "John Mwangi",      role: "Manager",        timeIn: "06:40", timeOut: "17:10", status: "Present", date: "2026-09-16" },
    { id: 12, name: "Peter Kariuki",    role: "Mason",          timeIn: "07:08", timeOut: "17:00", status: "Present", date: "2026-09-16" },
    { id: 13, name: "Brian Otieno",     role: "Driver",         timeIn: "06:50", timeOut: "16:30", status: "Present", date: "2026-09-16" },
    { id: 14, name: "Ruth Achieng",     role: "Site Clerk",     timeIn: "07:30", timeOut: "17:15", status: "Present", date: "2026-09-16" },
    { id: 15, name: "Alice Wanjiru",    role: "Plumber",        timeIn: null,   timeOut: null,   status: "Absent",  date: "2026-09-16" },
    { id: 16, name: "Sonia Wambui",     role: "Electrician",    timeIn: "07:12", timeOut: "16:44", status: "Present", date: "2026-09-15" },
    { id: 17, name: "Dennis Mureithi",  role: "Carpenter",      timeIn: null,   timeOut: null,   status: "Absent",  date: "2026-09-15" },
]

const DEFAULT_FROM = "2026-09-11"

function AttendanceRing({ pct, size = 150, stroke = 13, color = "#10b981" }) {
    const r = (size - stroke) / 2
    const c = 2 * Math.PI * r
    const offset = c - (pct / 100) * c

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none" />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    stroke={color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={c}
                    strokeDashoffset={offset}
                    fill="none"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-gray-800">{pct}%</span>
                <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">present</span>
            </div>
        </div>
    )
}

export function DailyAttendance() {
    const [fromDate, setFromDate] = useState(DEFAULT_FROM)
    const [toDate, setToDate] = useState(TODAY)
    const [query, setQuery] = useState("")

    const todayRows = useMemo(
        () => ATTENDANCE_ROWS.filter(r => r.date === TODAY),
        []
    )
    const presentToday = todayRows.filter(r => r.status === "Present").length
    const absentToday = todayRows.filter(r => r.status === "Absent").length
    const todayTotal = todayRows.length
    const attendancePct = todayTotal ? Math.round((presentToday / todayTotal) * 100) : 0

    const filteredRows = useMemo(() => {
        const q = query.trim().toLowerCase()
        return ATTENDANCE_ROWS.filter(r => {
            const inRange = (!fromDate || r.date >= fromDate) && (!toDate || r.date <= toDate)
            const match = !q
                || r.name.toLowerCase().includes(q)
                || r.role.toLowerCase().includes(q)
                || r.status.toLowerCase().includes(q)
            return inRange && match
        })
    }, [fromDate, toDate, query])

    const downloadReport = () => {
        const header = ["Employee", "Role", "Time In", "Time Out", "Status", "Date"]
        const lines = todayRows.map(r =>
            [r.name, r.role, r.timeIn ?? "-", r.timeOut ?? "-", r.status, r.date].join(",")
        )
        const csv = [header.join(","), ...lines].join("\n")
        const blob = new Blob([csv], { type: "text/csv" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `attendance-report-${TODAY}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="flex flex-col gap-4">
            {/* ── Date range + search ── */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col lg:flex-row gap-3 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">From</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50">
                        <CalendarDays size={14} className="text-gray-400" />
                        <input
                            type="date"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            className="text-xs bg-transparent text-gray-700 focus:outline-none"
                        />
                    </div>
                </div>
                <ChevronRight size={16} className="hidden lg:block text-gray-300 mb-2" />
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">To</label>
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50">
                        <CalendarDays size={14} className="text-gray-400" />
                        <input
                            type="date"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            className="text-xs bg-transparent text-gray-700 focus:outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 flex-1 lg:max-w-xs w-full">
                    <Search size={14} className="text-gray-400 flex-shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search employee, role or status…"
                        className="w-full text-xs bg-transparent text-gray-700 focus:outline-none"
                    />
                </div>
                <button
                    onClick={() => setQuery(q => q)}
                    className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                >
                    Search
                </button>
            </div>

            <div className="flex flex-col xl:flex-row gap-4 items-start">
                {/* ── Table ── */}
                <div className="flex-1 w-full bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <span className="text-sm font-semibold text-gray-800">Attendance Records</span>
                        <span className="text-[10px] font-mono text-gray-400">
                            {filteredRows.length} records
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-mono uppercase tracking-widest text-gray-400 border-b border-gray-100">
                                    <th className="px-4 py-2.5 font-medium">Employee</th>
                                    <th className="px-4 py-2.5 font-medium">Role</th>
                                    <th className="px-4 py-2.5 font-medium">Time In</th>
                                    <th className="px-4 py-2.5 font-medium">Time Out</th>
                                    <th className="px-4 py-2.5 font-medium">Attendance Status</th>
                                    <th className="px-4 py-2.5 font-medium">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400">
                                            No records match the current filters
                                        </td>
                                    </tr>
                                )}
                                {filteredRows.map(r => (
                                    <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-2.5 text-gray-800 font-medium whitespace-nowrap">{r.name}</td>
                                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{r.role}</td>
                                        <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{r.timeIn ?? "—"}</td>
                                        <td className="px-4 py-2.5 text-gray-600 font-mono text-xs">{r.timeOut ?? "—"}</td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                                r.status === "Present"
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : "bg-red-50 text-red-600 border border-red-200"
                                            }`}>
                                                {r.status === "Present" ? <UserCheck size={11} /> : <UserX size={11} />}
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{r.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* ── Today's summary + report ── */}
                <div className="xl:w-72 w-full bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-5">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-800">Today's Attendance</h3>
                        <p className="text-xs text-gray-400">{TODAY}</p>
                    </div>

                    <div className="flex flex-col items-center gap-1">
                        <AttendanceRing pct={attendancePct} />
                        <div className="flex items-center gap-2 mt-2">
                            <Users size={14} className="text-gray-400" />
                            <span className="text-xs text-gray-500">
                                {presentToday} of {todayTotal} employees on site
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 flex flex-col items-center">
                            <UserCheck size={16} className="text-emerald-600 mb-1" />
                            <span className="text-xl font-bold text-emerald-700 tabular-nums">{presentToday}</span>
                            <span className="text-[10px] font-medium text-emerald-600">Present</span>
                        </div>
                        <div className="rounded-xl border border-red-100 bg-red-50 p-3 flex flex-col items-center">
                            <UserX size={16} className="text-red-500 mb-1" />
                            <span className="text-xl font-bold text-red-600 tabular-nums">{absentToday}</span>
                            <span className="text-[10px] font-medium text-red-500">Absent</span>
                        </div>
                    </div>

                    <button
                        onClick={downloadReport}
                        className="mt-auto flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium px-4 py-2.5 rounded-lg transition-colors"
                    >
                        <Download size={14} />
                        Download Report
                    </button>
                </div>
            </div>
        </div>
    )
}