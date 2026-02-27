import React from "react"
import { useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { LocalizedNavigate } from "./LocaleLayout"

interface ProtectedRouteProps {
  children: React.ReactElement
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "#1E3A8A",
        }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: "18px",
          }}
        >
          Loading...
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated; pass current path so login can redirect back after success
  if (!isAuthenticated) {
    return <LocalizedNavigate to="/login" replace state={{ from: location }} />
  }

  // Render the protected component
  return children
}

