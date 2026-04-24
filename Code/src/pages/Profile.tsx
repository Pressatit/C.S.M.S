// ii ndo page yenye itatumika kama home page ndo like mwenye amelogin ataona staff za project yake


import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { User, Mail, Shield, LogOut, Plus, Radio, ChevronDown, Construction } from "lucide-react"

interface UserData {
  id: number
  name: string
  email: string
  role: string
}

export function Profile() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserData | null>(null)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showWorkersMessage, setShowWorkersMessage] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  const handleAddProject = () => {
    setShowComingSoon(true)
  }

  const handleWorkers = () => {
    setShowWorkersMessage(true)
  }

  const toggleProjectDropdown = () => {
    setShowProjectDropdown(!showProjectDropdown)
  }

  const getRoleDisplay = (role: string) => {
    const roleMap: Record<string, string> = {
      worker: "Worker",
      supervisor: "Supervisor", 
      manager: "Manager",
      admin: "Administrator"
    }
    return roleMap[role] || role
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold text-gray-800 mb-1">Profile</h1>
      <p className="text-sm text-gray-500 mb-6">Manage your account</p>

      {user && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={32} className="text-gray-500" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{user.name}</h2>
                <p className="text-sm text-gray-500">{getRoleDisplay(user.role)}</p>
              </div>
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-gray-400" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm text-gray-700">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield size={18} className="text-gray-400" strokeWidth={1.5} />
                <div>
                  <p className="text-xs text-gray-400">Role</p>
                  <p className="text-sm text-gray-700">{getRoleDisplay(user.role)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Projects</h3>
            <div className="space-y-3">
              <button 
                onClick={toggleProjectDropdown}
                className="flex items-center justify-between w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Radio size={18} className="text-gray-500" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-gray-700">Default Project</span>
                </div>
                <ChevronDown size={18} className={`text-gray-400 transition-transform ${showProjectDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showProjectDropdown && (
                <div className="space-y-2 pl-4">
                  <Link to="/live" className="block w-full text-left px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors">
                    View Project
                  </Link>
                  <button 
                    onClick={handleWorkers}
                    className="w-full text-left px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-md transition-colors"
                  >
                    Workers
                  </button>
                </div>
              )}

              {showWorkersMessage && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600 text-center italic">
                    Service coming soon
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-md opacity-50">
                <div className="flex items-center gap-3">
                  <Construction size={18} className="text-gray-400" strokeWidth={1.5} />
                  <span className="text-sm font-medium text-gray-500">Your Projects</span>
                </div>
                <span className="text-xs text-gray-400">Coming soon</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
            <div className="space-y-3">
              <button 
                onClick={handleAddProject}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
              >
                <Plus size={18} />
                <span>Add New Project</span>
              </button>
              
              {showComingSoon && (
                <div className="p-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600 text-center italic">
                    Service coming soon
                  </p>
                </div>
              )}

              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-red-600 text-sm font-medium rounded-md transition-colors"
              >
                <LogOut size={18} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}