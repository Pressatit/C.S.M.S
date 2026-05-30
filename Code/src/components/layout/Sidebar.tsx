import {NavLink,useLocation} from "react-router-dom"
import{Radio,PlayCircle,HardHat,BarChart3,Truck,Bot,ChevronLeft,ChevronRight,Construction} from "lucide-react"

import { NAV_ITEMS } from "../../config/navigation"

const ICON_MAP = {Radio,PlayCircle,HardHat,BarChart3,Truck,Bot}

interface SidebarProps{
    isCollapsed: boolean,
    onToggle:() => void
}

export function Sidebar({isCollapsed,onToggle} :SidebarProps){
 const location = useLocation()
 return(
    <aside className={`flex h-screen flex-col bg-gray-100 border-r border-gray-200 transition-all duration-300 ease-in-out flex-shrink-0 overflow-visible ${isCollapsed ? "w-16" : "w-64"}`}>
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-200">
        {!isCollapsed && (
            <div className="flex min-w-0 items-center gap-2">
                <Construction size={20} className="text-gray-700" strokeWidth={1.5}/>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 leading-none">CSMS</p>
                    <p className="mt-0.5 text-xs text-gray-500 truncate">Construction Site Management System</p>
                </div>
            </div>
        )}
        {isCollapsed && ( <Construction size ={20} className="text-gray-700 mx-auto" strokeWidth={1.5}/>)}
        {!isCollapsed && (
        <button onClick={onToggle} className="p-1 rounded hover:bg-gray-200 text-gray-500 transition-colors">
            <ChevronLeft size={16}/>
        </button>)} 
      </div>
      
      {!isCollapsed && (
        <p className="text-xs font-medium text-gray-400 uppercase tracking-widest px-4 pt-4 pb-2">Menu</p>
      )}
      
      <nav className ="flex-1 px-2 py-2 space-y-1 overflow-visible">
        {NAV_ITEMS.map((item) => {
            const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP]
            const isActive =location.pathname.startsWith(item.path)
             return(
                <NavLink key ={item.path} to ={item.path} 
                className={({isActive: a})=>
                `flex items-center rounded-lg transition-colors duration-150 text-sm font-medium ${isCollapsed ? "justify-center px-2 py-2.5": "gap-3 px-3 py-2.5"} ${a? "bg-white text-gray-900 shadow-sm":"text-gray-600 hover:bg-gray-200"}`}>
                    {Icon && <Icon size={18} strokeWidth={1.5} className={isActive ?"text-gray-900":"text-gray-500"} />}
                 {!isCollapsed && (
                    <span className= "truncate">{item.label}</span>
                 )}
                 {isCollapsed && (
                     <div className="absolute left-full ml-2 ml-3 top -1/2 -translate-y-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-[999] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                      {item.label}
                     </div>
                 )}
                 </NavLink>
             )

})}
     </nav>
     {isCollapsed && (
        <div className="p-2 border-t border-gray-200">
            <button onClick={onToggle}
            className="w-full flex justify-center p-2 rounded-lg hover:bg-gray-200 text-gray-500">
                <ChevronRight size={16}/>
            </button>
        </div>
    )}

     </aside>
 )

}
