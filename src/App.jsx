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
import AdminUsers from './pages/AdminUsers'
import AccessDenied from './pages/AccessDenied'
import AccessExpired from './pages/AccessExpired'
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
  const { user: _user, hasFeature, currentUser } = useAppContext()
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated())
  const navigate = useNavigate()
  const isAdmin = currentUser?.role === 'admin'

  // Verificar si el usuario ya está autenticado al cargar la aplicación
  useEffect(() => {
    setIsAuthenticated(!!_user)
  }, [_user])

  // Función para manejar el inicio de sesión
  const handleLogin = async (_user) => {
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
    authService.logout()
    setIsAuthenticated(false)
    navigate('/login')
  }

  const guard = (featureKey, Component, options = {}) => {
    if (!isAuthenticated) return <Navigate to="/login" />
    if (options.requireAdmin && !isAdmin) {
      return <AccessDenied feature={options.featureLabel || 'admin'} />
    }
    if (featureKey && !hasFeature(featureKey)) {
      return <AccessDenied feature={options.featureLabel || featureKey} />
    }
    return <Component />
  }

  return (
    <Routes>
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />} 
      />
      <Route 
        path="/access/expired"
        element={<AccessExpired />}
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
          element={guard('dashboard', Dashboard)} 
        />
        <Route 
          path="/calculator" 
          element={guard('calculator', DistanceCalculator)} 
        />
        <Route 
          path="/tracking" 
          element={guard('tracking', TripTracking)} 
        />
        <Route 
          path="/invoices" 
          element={guard('invoices', Invoices)} 
        />
        <Route 
          path="/settings" 
          element={guard('settings', Settings)} 
        />
        <Route
          path="/admin/users"
          element={guard('admin_users', AdminUsers, { requireAdmin: true, featureLabel: 'panel de usuarios' })}
        />
      </Route>
    </Routes>
  )
}

export default App