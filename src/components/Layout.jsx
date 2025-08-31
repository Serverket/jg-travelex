import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import ApiHealthIndicator from './ApiHealthIndicator'
import Logo from './Logo'

const Layout = ({ onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const navLinkClass = ({ isActive }) => {
    return `block px-4 py-2 rounded-md ${isActive ? 'bg-blue-600 text-white' : 'hover:bg-gray-100'}`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Logo 
                size="small" 
                variant="black"
                showText={true}
                text="JGEx"
                className="transition-transform hover:scale-105"
              />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
              <NavLink to="/calculator" className={navLinkClass}>Calculadora</NavLink>
              <NavLink to="/tracking" className={navLinkClass}>Seguimiento</NavLink>
              <NavLink to="/invoices" className={navLinkClass}>Facturas</NavLink>
              <NavLink to="/settings" className={navLinkClass}>Configuración</NavLink>
              <button 
                onClick={onLogout}
                className="px-4 py-2 rounded-md text-red-600 hover:bg-red-50"
              >
                Cerrar Sesión
              </button>
            </nav>
            
            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <span className="sr-only">Abrir menú</span>
                <svg 
                  className="h-6 w-6" 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d={isMobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} 
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden mt-2 bg-white shadow-lg rounded-md absolute right-0 left-0 z-20 mx-4`}>
            <div className="py-2">
              <NavLink to="/dashboard" className="block px-4 py-2 hover:bg-gray-100" onClick={closeMobileMenu}>Dashboard</NavLink>
              <NavLink to="/calculator" className="block px-4 py-2 hover:bg-gray-100" onClick={closeMobileMenu}>Calculadora</NavLink>
              <NavLink to="/tracking" className="block px-4 py-2 hover:bg-gray-100" onClick={closeMobileMenu}>Seguimiento</NavLink>
              <NavLink to="/invoices" className="block px-4 py-2 hover:bg-gray-100" onClick={closeMobileMenu}>Facturas</NavLink>
              <NavLink to="/settings" className="block px-4 py-2 hover:bg-gray-100" onClick={closeMobileMenu}>Configuración</NavLink>
              <button 
                onClick={(e) => {
                  closeMobileMenu();
                  onLogout(e);
                }}
                className="block w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-white shadow-inner py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} JGEx - Calculadora de Distancias
          </p>
        </div>
      </footer>
      
      {/* API Health Indicator */}
      <ApiHealthIndicator />
    </div>
  )
}

export default Layout