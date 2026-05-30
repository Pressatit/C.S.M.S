import {useLocation, Link} from "react-router-dom"
import {Radio,PlayCircle,HardHat,BarChart3,Truck,Bot,User,Construction,Bell} from "lucide-react"

import { NAV_ITEMS } from "../../config/navigation"

const ICON_MAP ={Radio,PlayCircle,HardHat,BarChart3,Truck,Bot}

interface Topbarprops{
    alertCount?:number
}

export function Topbar({alertCount=0}:Topbarprops){
    const location = useLocation()
    const page =NAV_ITEMS.find(item=> location.pathname.startsWith(item.path))
    const PageIcon = page ? ICON_MAP[page.icon as keyof typeof ICON_MAP]: null 
    return(
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 flex-shrink-0">
            <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
                 {/*Left side : Logo and App Name*/} 
                 <div className="flex items-center gap-2 min-w-0">
                    <Construction size={16} className="text-gray-400" strokeWidth={.5}/>
                    <span className="text-sm font-semibold text-gray-800 tracking-wide">CSMS</span> 
                 </div>
                    {/*Center : Current Page name, and icon */}
                <div className="flex flex-1 items-center justify-center gap-2 min-w-0 order-3 w-full sm:order-none sm:w-auto">
                    {PageIcon && <PageIcon size={16} strokeWidth={1.5} className={page?.path === "/live" ? "text-red-500" :"text-gray-600"}/>}
                    <span className="truncate text-sm font-medium text-gray-800">{page?.label ?? "C.S.M.S"}</span>
                </div>
                    {/*Right Side: Notification  and user profile*/}
                <div className="flex items-center gap-3">
                    <button className="relative p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        <Bell size ={18} strokeWidth={.5}/>
                        {alertCount > 0 && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-red-500 rounded-full"/>}
                    </button>
                    <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100">
                        <div className="w-7 h-7 rounded-full bg-gray-300 flex items-center justify-center">
                            <User size={14} className="text-gray-500" strokeWidth={.5}/>
                        </div>
                        <span className="hidden text-sm text-gray-700 font-medium sm:inline">Profile</span>
                    </Link>
                </div>
            </div>
        </header>

    )
}
