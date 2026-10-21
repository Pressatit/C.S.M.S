import { useState ,useMemo ,useEffect} from "react"
import { Users, MapPin, ClipboardList, FileText, Clock ,Search ,Filter,Edit2,Trash2,Plus, X, Delete} from "lucide-react"
import { SiteLiveMap } from "../components/employee/SiteMap"
import { DailyAttendance } from "../components/employee/DailyAttendance"
import { apiRequest } from "../utils/api"

export interface Employee{
    empid : number,
    name: string,
    initials: string,
    role : string,
    idNo :string,
    phone : string,
    ble: string

} 

export interface EmployeeFormData {
  first_name: string;
  second_name: string;
  id_number: string;
  ble_uuid: string;
  phone_number: string;
  role: string;
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



const TABS = [
    { id: "employees",   label: "Site Employees and Roles", icon: Users },
    { id: "location",    label: "Onsite Live Location",      icon: MapPin },
    { id: "attendance",  label: "Daily Attendance",          icon: ClipboardList },
    
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
    { id: "office", label: "Site Office",   color: "#dbeafe", border: "#93c5fd", active: true },
    { id: "zoneA",    label: "Zone A",       color: "#fef3c7", border: "#fcd34d", active: true },
    { id: "zoneB",    label: "Zone B",       color: "#fce7f3", border: "#f9a8d4", active: true },
    { id: "zoneC",      label: "Zone C", color: "#d1fae5", border: "#6ee7b7", active: true },
    { id: "zoneD",   label: "Zone D",       color: "#e0e7ff", border: "#a5b4fc", active: false },
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
    { id: "EMP-001", name: "John Mwangi",     role: "Manager",        zone: "office",    x: 40, y: 200 },
    { id: "EMP-014", name: "Peter Kariuki",   role: "Mason",          zone: "zoneA",   x: 250,   y: 400 },
    { id: "EMP-032", name: "Alice Wanjiru",   role: "Plumber",        zone: "zoneB",   x: 300,  y: 300 },
    { id: "EMP-057", name: "Grace Nyambura",  role: "Safety Officer", zone: "entrance",    x: -85, y: -50 },
]

const ACTIVE_ZONE_COUNT = ZONES.filter(z => z.active).length
const ON_SITE_ROLES = Array.from(new Set(ON_SITE_EMPLOYEES.map(e => e.role)))

export function EmployeeManagement(){
    const [activeTab, setActiveTab] = useState<TabId>("employees")
    const lastUpdated = new Date().toLocaleTimeString()
    const [IsModalOpen ,setIsModalOpen] = useState(false)
    const [query ,setQuery] =useState ("")
    const [employees, setEmployees] =useState<any[]>([])

    const TOTAL_EMPLOYEES = employees.length
    
    useEffect(() => {
  async function fetchEmployees() {
    try {
      
      const token = localStorage.getItem("token"); 

      const res = await fetch("http://localhost:8000/employees", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        const data = await res.json();
        
        setEmployees(data)
        console.log("Fetched employees:", data);
        
      } else {
        console.error("Failed to fetch:", res.status);
      }
    } catch (err) {
      console.error("Network error:", err);
    }
  }

  fetchEmployees();
}, []); 

    

    const [formData, setFormData] = useState<EmployeeFormData>({
        first_name : "",
        second_name : "",
        id_number: "",
        ble_uuid: "",
        role : "",
        phone_number :""

      });

    const dynamicSiteRoles = useMemo(() => {
    if (!employees || employees.length === 0) return [];

    const counts: Record<string, number> = {};

    employees.forEach(emp => {
        // Only count if the role exists and isn't empty
        if (emp.role && emp.role.trim() !== "") {
            // Capitalize the first letter so "mason" and "Mason" group together perfectly
            const rawRole = emp.role.trim();
            const cleanRole = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();
            
            counts[cleanRole] = (counts[cleanRole] || 0) + 1;
        }
    });

    // Convert the counts object into an array and sort it from highest to lowest count
     return Object.entries(counts)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count);
        
     }, [employees]);
  
    const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    
    return employees?.filter(emp => {
        // 1. Safely combine names (fallback to empty strings if null)
        const fName = emp.first_name || "";
        const sName = emp.second_name || "";
        const fullName = `${fName} ${sName}`.toLowerCase();

        // 2. Safely check role and ID using optional chaining (?.)
        // If emp.role is null/undefined, it stops immediately and returns false instead of crashing
        const roleMatch = emp.role?.toLowerCase().includes(q) || false;
        const idMatch = emp.employee_id?.toLowerCase().includes(q) || false;

        // 3. Return the row if the query is empty, OR if any of the fields match
        return !q || fullName.includes(q) || roleMatch || idMatch;
         });
          }, [query, employees]);
      

      async function handleAddEmployee(e:React.FormEvent){
              e.preventDefault();
              
              try{

              const res= await apiRequest<Employee>("/employees",{
                method:"POST",
                body:JSON.stringify(formData)
              })

      
              console.log(`Employee ${res.name} created successfully`)
              setFormData({
              first_name: "",
              second_name: "",
              id_number: "",
              ble_uuid: "",
              phone_number: "",
              role:""
            });
               
            }
            catch(err){
              console.log("Failed to create Employee ",err)
      
            }}

      async function handleDelete(id:number,) {
        try{
        const res = await apiRequest(`/employees/${id}`,{method:"DELETE"})
        //toast message

        }
        catch(error)
        {
          console.log(`Error Deleting Employee ${error}`)
        }   
      }

    return(
        <div className="p-6 flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-semibold text-gray-800 mb-1">Employee Management</h1>
                <p className="text-sm text-gray-500">Site employee records, attendance and BLE tracking</p>
            </div>

            {/* ── Tabs ── */}
            <div className="flex items-center gap-2 p-1.5 rounded-full w-fit bg-white">
                {TABS.map(tab => {
                    const active = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2 text-sm font-medium rounded-full transition-colors ${
                                active
                                    ? "bg-black text-white"
                                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                            }`}
                        >
                            {tab.label}
                        </button>
                    )
                })}
            </div>
            {/* ── Tab panels ── */}
            {activeTab === "employees" && (
              <div className="flex flex-col gap-6">

                <div className="flex gap-4">
                  
                  {/* Total employees registered */}
                  <div className="bg-[#e5e7eb] rounded-xl p-5 flex flex-col items-center justify-center min-w-[200]">
                            <p className="text-sm font-medium text-gray-700">Total Employees</p>
                            <p className="text-4xl font-bold text-gray-900 my-1">{TOTAL_EMPLOYEES}</p>
                            <p className="text-xs text-gray-600">registered to site</p>
                   </div>

                    {/* Total site roles */}
                   <div className="bg-[#e5e7eb] rounded-xl p-5 flex-1">
                            <p className="text-sm font-bold text-gray-900 text-center mb-3">Total Site roles</p>
                            <div className="grid grid-cols-3 gap-y-2 text-sm text-gray-700 max-w-2xl mx-auto">
                                {dynamicSiteRoles.map(role => (
                                    <div key={role.label}>
                                        {role.label}: <span className="font-semibold">{role.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                   {/* EMPLOYEE TABLE */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        
                        {/* Toolbar */}
                        <div className="p-4 flex items-center justify-between border-b border-gray-100">
                            <div className="relative flex-1 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input 
                                    type="text" 
                                    value={query}
                                    onChange={e => setQuery(e.target.value)}
                                    placeholder="Search by name, ID or role..." 
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">
                                    <Filter size={14} />
                                    All roles
                                </button>
                                <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800" onClick={()=>setIsModalOpen(true)}>
                                    <Plus size={16} />
                                    Add Employee
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4">Employee</th>
                                        <th className="px-6 py-4">ID No.</th>
                                        <th className="px-6 py-4">Role</th>
                                        <th className="px-6 py-4">Phone</th>
                                        <th className="px-6 py-4">BLE Tag</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredRows?.map((emp, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 flex-shrink-0">
                                                        {emp.initials}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">{emp.first_name} {emp.second_name}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono">{emp.employee_id}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-gray-500 font-mono text-xs">{emp.id_number}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-100 w-fit px-2.5 py-1 rounded-full">
                                                    <span className="w-1.5 h-1.5 rounded-full border border-gray-400" />
                                                    {emp.role}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-gray-500 text-xs">{emp.phone_number}</td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500 font-mono">
                                                    <span className="text-blue-400">🛜</span> {emp.ble_uuid}
                                                </div>
                                            </td>
                                            <td className="px-6 py-3 text-right">
                                                <div className="flex items-center justify-end gap-3 text-gray-400">
                                                    <button className="hover:text-gray-600 transition-colors"><Edit2 size={14} /></button>
                                                    <button onClick={()=>handleDelete(emp.id)} className="hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
          {IsModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800">Register New Site Employee</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddEmployee} className="space-y-3">
        
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">First Name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />

                  <label className="text-xs font-semibold text-gray-600">Second Name</label>
                  <input
                    type="text"
                    required
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                    value={formData.second_name}
                    onChange={(e) => setFormData({ ...formData, second_name: e.target.value })}
                  />

                   <label className="text-xs font-semibold text-gray-600">Phone Number</label>
                  <input
                    type="string"
                    required
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                </div>

               
            
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Site Role</label>
                <input
                  type="text"
                  required
                  placeholder="Driver, Carpenter, Mason ,Plumber"
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                
                <div>
                  <label className="text-xs font-semibold text-gray-600">Employee BLE ID</label>
                  <input
                    type="text"
                    required
                    placeholder="FDA50693A4E2A"
                    className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                    value={formData.ble_uuid || ""}
                    onChange={(e) => setFormData({ ...formData, ble_uuid:String (e.target.value) })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">ID Number</label>
                <input
                  type="tel"
                  required
                  className="w-full border border-gray-200 rounded-lg p-2 text-sm mt-1 focus:outline-gray-800"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium bg-gray-800 hover:bg-blue-700 text-white rounded-lg"
                >
                  Save Employee
                </button>
              </div>
            </form>
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

            
        </div>
    )
}