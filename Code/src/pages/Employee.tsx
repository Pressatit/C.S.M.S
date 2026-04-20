
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


 

export function EmployeeManagement(){
    const modules =[
            {label:"Site Employees and roles",color :"bg-sky-300"},
            {label:"On-site Live location",color :"bg-indigo-300"},
            {label: "Daily Attendance",color: "bg-rose-300"},
            {label: "Report",color: "bg-purple-300"},
            
        ]
    return(
        <div className="p-6">
            <h1 className="text-xl font-semibold text-gray-800 mb-1">Employee Management</h1>
            <p className="text-sm text-gray-500">Site Employee Records,Employee Attendance records and BLE tracking</p>
            <div className="mt-6 grid grid-cols-2 gap-4">
                {modules.map(m=>(<div key={m.label} className={`${m.color} rounded-xl p-6 cursor-pointer hover:opacity-90 h-48 flex items-end`}>
                    <span className="text-sm font-medium text-white">{m.label}</span>
                </div>
            ))}
        </div>
        </div>

       
    )
}

