const API_BASE = "http://localhost:8000"

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = localStorage.getItem("token")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token && !options.skipAuth) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })

  if (response.status === 401) {
    const refreshToken = localStorage.getItem("refresh_token")
    if (refreshToken && !endpoint.includes("/token/refresh")) {
      try {
        const refreshResponse = await fetch(`${API_BASE}/token/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        })

        if (refreshResponse.ok) {
          const data = await refreshResponse.json()
          localStorage.setItem("token", data.access_token)
          if (data.refresh_token) {
            localStorage.setItem("refresh_token", data.refresh_token)
          }
          headers["Authorization"] = `Bearer ${data.access_token}`
          const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers,
          })
          if (!retryResponse.ok) {
            throw new Error("Request failed after token refresh")
          }
          return retryResponse.json()
        }
      } catch {
        // refresh failed, proceed to logout
      }
    }

    localStorage.removeItem("token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
    window.location.href = "/login"
    throw new Error("Session expired")
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}
