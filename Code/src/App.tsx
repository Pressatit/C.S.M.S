import {BrowserRouter,Routes,Route,Navigate,Outlet} from "react-router-dom"
import {Shell} from "./components/layout/Shell"

import { Liveview } from "./pages/Liveview"
import { Login } from "./pages/Login"
import { Signup } from "./pages/Signup"
import { Profile } from "./pages/Profile"
import { Playback} from "./pages/Playback"
import { EmployeeManagement } from "./pages/Employee"
import { AssetManagement } from "./pages/Asset"
import { SiteProgress } from "./pages/Progress"
import { ProjectAdvisor } from "./pages/Advisor"
import { NotFound } from "./pages/NotFound"

function ProtectedLayout() {
  const token = localStorage.getItem("token")
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <Outlet/>
}

export default function App(){
    return(
        <BrowserRouter>
          <Routes>
            {/* Public routes - no auth required */}
            <Route path="/login" element={<Login/>}/>
            <Route path="/signup" element={<Signup/>}/>
            
            {/* Protected routes - auth required */}
            <Route element={<ProtectedLayout/>}>
              {/* Standalone pages - full page layout */}
              <Route path="/profile" element={<Profile/>}/>
              
              {/* App shell pages - with sidebar/topbar */}
              <Route path="/" element={<Shell/>}>
                 <Route index element={<Navigate to="/live" replace />}/>
                 <Route path="live"       element={<Liveview/>}/>
                 <Route path="playback"   element={<Playback/>}/>
                 <Route path="employees"  element={<EmployeeManagement/>}/>
                 <Route path="assets"     element={<AssetManagement/>}/>
                 <Route path="progress"   element={<SiteProgress/>}/>
                 <Route path="advisor"    element={<ProjectAdvisor/>}/>
                 <Route path="*" element={<NotFound/>}/>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
    )

}