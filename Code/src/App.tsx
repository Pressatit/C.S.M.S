import {BrowserRouter,Routes,Route,Navigate} from "react-router-dom"
import {Shell} from "./components/layout/Shell"

import { Liveview } from "./pages/Liveview"
import { Playback} from "./pages/Playback"
import { EmployeeManagement } from "./pages/Employee"
import { AssetManagement } from "./pages/Asset"
import { SiteProgress } from "./pages/Progress"
import { ProjectAdvisor } from "./pages/Advisor"
import { NotFound } from "./pages/NotFound"



export default function App(){
    return(
        <BrowserRouter>
         <Routes>
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
         </Routes>
        </BrowserRouter>
    )

}

