import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { User, Mail, Shield, LogOut, Plus, Radio, ChevronDown, Construction } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

export function Profile() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const [showWorkersMessage, setShowWorkersMessage] = useState(false)

  const handleLogout = () => {
    logout()
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
      admin: "Administrator",
    }
    return roleMap[role] || role
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <div>
          <h1 className="mb-1 text-xl font-semibold text-gray-800">Profile</h1>
          <p className="text-sm text-gray-500">Manage your account</p>
        </div>

        {user && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-6">
              <section className="flex min-w-[280px] flex-1 basis-[320px] flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200">
                    <User size={32} className="text-gray-500" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-gray-800">{user.name}</h2>
                    <p className="text-sm text-gray-500">{getRoleDisplay(user.role)}</p>
                  </div>
                </div>

                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="shrink-0 text-gray-400" strokeWidth={1.5} />
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="truncate text-sm text-gray-700">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Shield size={18} className="shrink-0 text-gray-400" strokeWidth={1.5} />
                    <div>
                      <p className="text-xs text-gray-400">Role</p>
                      <p className="text-sm text-gray-700">{getRoleDisplay(user.role)}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="flex min-w-[280px] flex-1 basis-[320px] flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <h3 className="mb-4 text-lg font-semibold text-gray-800">Projects</h3>
                <div className="space-y-3">
                  <button
                    onClick={toggleProjectDropdown}
                    className="flex w-full items-center justify-between rounded-md bg-gray-50 p-4 transition-colors hover:bg-gray-100"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Radio size={18} className="shrink-0 text-gray-500" strokeWidth={1.5} />
                      <span className="truncate text-sm font-medium text-gray-700">Default Project</span>
                    </div>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 text-gray-400 transition-transform ${showProjectDropdown ? "rotate-180" : ""}`}
                    />
                  </button>

                  {showProjectDropdown && (
                    <div className="space-y-2 pl-4">
                      <Link
                        to="/live"
                        className="block w-full rounded-md bg-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-200"
                      >
                        View Project
                      </Link>
                      <button
                        onClick={handleWorkers}
                        className="w-full rounded-md bg-gray-100 px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-200"
                      >
                        Workers
                      </button>
                    </div>
                  )}

                  {showWorkersMessage && (
                    <div className="rounded-md bg-gray-50 p-4">
                      <p className="text-center text-sm italic text-gray-600">Service coming soon</p>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-gray-50 p-4 opacity-50">
                    <div className="flex min-w-0 items-center gap-3">
                      <Construction size={18} className="shrink-0 text-gray-400" strokeWidth={1.5} />
                      <span className="truncate text-sm font-medium text-gray-500">Your Projects</span>
                    </div>
                    <span className="text-xs text-gray-400">Coming soon</span>
                  </div>
                </div>
              </section>
            </div>

            <section className="flex min-w-[280px] flex-1 basis-[320px] flex-col rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Actions</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleAddProject}
                  className="flex min-h-11 flex-1 basis-[220px] items-center justify-center gap-2 rounded-md bg-gray-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  <Plus size={18} />
                  <span>Add New Project</span>
                </button>

                <button
                  onClick={handleLogout}
                  className="flex min-h-11 flex-1 basis-[220px] items-center justify-center gap-2 rounded-md border border-gray-200 px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-gray-50"
                >
                  <LogOut size={18} />
                  <span>Log Out</span>
                </button>
              </div>

              {showComingSoon && (
                <div className="mt-3 rounded-md bg-gray-50 p-4">
                  <p className="text-center text-sm italic text-gray-600">Service coming soon</p>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
