import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DistanceCalculator from './pages/DistanceCalculator'
import TripTracking from './pages/TripTracking'
import Invoices from './pages/Invoices'
import Settings from './pages/Settings'
import Layout from './components/Layout'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const navigate = useNavigate()

  // Verificar si el usuario ya está autenticado al cargar la aplicación
  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated')
    if (auth === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  // Función para manejar el inicio de sesión
  const handleLogin = (username, password) => {
    const validUsername = import.meta.env.VITE_APP_USERNAME
    const validPassword = import.meta.env.VITE_APP_PASSWORD

    if (username === validUsername && password === validPassword) {
      setIsAuthenticated(true)
      localStorage.setItem('isAuthenticated', 'true')
      navigate('/dashboard')
      return true
    }
    return false
  }

  // Función para manejar el cierre de sesión
  const handleLogout = () => {
    setIsAuthenticated(false)
    localStorage.removeItem('isAuthenticated')
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