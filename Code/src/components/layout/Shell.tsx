import {useState} from "react"
import { Outlet } from "react-router-dom"

import { Sidebar } from "./Sidebar"
import {Topbar} from "./topbar"

export function Shell(){
    const [sidebarCollapsed, setsidebarCollapsed] = useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-gray-50">
            <Sidebar isCollapsed={sidebarCollapsed} onToggle={()=>setsidebarCollapsed(prev=>!prev)}/>
            
            <div className="flex-1 flex flex-col min-w-0">
                <Topbar/>
                <main className="flex-1 overflow-y-auto min-w-0" >

                    <Outlet/> {/*Current page renders here */}
                    
                </main>
            </div>
        </div>
    )
}
