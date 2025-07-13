import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AppProvider, useAppContext } from './context/AppContext'
import { authService } from './services/authService'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DistanceCalculator from './pages/DistanceCalculator'
import TripTracking from './pages/TripTracking'
import Invoices from './pages/Invoices'
import Settings from './pages/Settings'
import Layout from './components/Layout'

// Componente principal de la aplicación
function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  )
}

// Componente para gestionar rutas y autenticación
function AppRoutes() {
  const { currentUser, logout } = useAppContext()
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isLoggedIn())
  const navigate = useNavigate()

  // Verificar si el usuario ya está autenticado al cargar la aplicación
  useEffect(() => {
    setIsAuthenticated(!!currentUser)
  }, [currentUser])

  // Función para manejar el inicio de sesión
  const handleLogin = async (user) => {
    try {
      // El login ya fue procesado en el componente Login con authService
      // Aquí solo necesitamos actualizar el estado y redirigir
      setIsAuthenticated(true)
      navigate('/dashboard')
      return true
    } catch (error) {
      console.error('Error en manejo de login:', error)
      return false
    }
  }

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    logout()
    setIsAuthenticated(false)
    navigate('/login')
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
      />
      <Route 
        path="/" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
      />
      <Route 
        element={<Layout onLogout={handleLogout} />}
      >
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/calculator" 
          element={isAuthenticated ? <DistanceCalculator /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tracking" 
          element={isAuthenticated ? <TripTracking /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/invoices" 
          element={isAuthenticated ? <Invoices /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/settings" 
          element={isAuthenticated ? <Settings /> : <Navigate to="/login" />} 
        />
      </Route>
    </Routes>
  )
}

export default App