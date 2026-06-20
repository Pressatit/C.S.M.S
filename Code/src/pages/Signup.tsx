import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Check, Construction, Eye, EyeOff, KeyRound, UserPlus, X } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"

const API_BASE = "http://localhost:8000";
interface RegisterResponse {
  access_token: string
  token_type: string
  refresh_token?: string
  detail?: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
}

const lowercaseChars = "abcdefghijklmnopqrstuvwxyz"
const uppercaseChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const numberChars = "0123456789"
const symbolChars = "!@#$%^&*"
const passwordChars = lowercaseChars + uppercaseChars + numberChars + symbolChars

function secureRandomIndex(max: number) {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] % max
}

function generateStrongPassword() {
  const requiredChars = [
    lowercaseChars[secureRandomIndex(lowercaseChars.length)],
    uppercaseChars[secureRandomIndex(uppercaseChars.length)],
    numberChars[secureRandomIndex(numberChars.length)],
    symbolChars[secureRandomIndex(symbolChars.length)],
  ]

  while (requiredChars.length < 8) {
    requiredChars.push(passwordChars[secureRandomIndex(passwordChars.length)])
  }

  for (let index = requiredChars.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1)
    const current = requiredChars[index]
    requiredChars[index] = requiredChars[swapIndex]
    requiredChars[swapIndex] = current
  }

  return requiredChars.join("")
}

export function Signup() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("supervisor")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const passwordChecks = [
    { label: "more than 8 characters", passed: password.length >= 8 },
    { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
    { label: "Lowercase letter", passed: /[a-z]/.test(password) },
    { label: "Number", passed: /\d/.test(password) },
    { label: "Symbol", passed: /[^A-Za-z0-9]/.test(password) },
  ]
  const isPasswordStrong = passwordChecks.every((check) => check.passed)

  const handleGeneratePassword = () => {
    setPassword(generateStrongPassword())
    setShowPassword(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!isPasswordStrong) {
      setError("Password must be 8 characters and include uppercase, lowercase, number, and symbol.")
      return
    }

    setLoading(true)
 
    try {
      const response = await fetch(`${API_BASE}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      })

      const data: RegisterResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || "Registration failed")
      }

      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token)
      }
      login(data.access_token, data.user)
      navigate("/live")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Email may already be in use.")
    } finally {
      setLoading(false)
    }
  }

  return (
    // apa ndo kuna io logic
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Construction size={28} className="text-gray-700" strokeWidth={1.5} />
            <div>
              <p className="text-lg font-semibold text-gray-800 leading-none">CSMS</p>
              <p className="text-xs text-gray-500">Construction Site Management</p>
            </div>
          </div>

          <h1 className="text-xl font-semibold text-gray-800 text-center mb-2">Create Account</h1>
          <p className="text-sm text-gray-500 text-center mb-6">Register to start using CSMS</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1.5">
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors"
              >
                <option value="manager">Site manager</option>
                <option value="investor">Investor</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  <KeyRound size={14} />
                  <span>Generate</span>
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-400 transition-colors pr-10"
                  placeholder="Min. 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {passwordChecks.map((check) => (
                  <div
                    key={check.label}
                    className={`flex items-center gap-1.5 text-xs ${
                      check.passed ? "text-green-700" : "text-gray-500"
                    }`}
                  >
                    {check.passed ? <Check size={14} /> : <X size={14} />}
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordStrong}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-md transition-colors"
            >
              {loading ? (
                <span>Creating account...</span>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Sign Up</span>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{" "}
            <Link to="/login" className="text-gray-800 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
