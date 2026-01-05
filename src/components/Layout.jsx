import { useMemo, useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import ApiHealthIndicator from './ApiHealthIndicator'
import Logo from './Logo'
import { useAppContext } from '../context/AppContext'

const Layout = ({ onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { currentUser, hasFeature } = useAppContext()
  const isAdmin = currentUser?.role === 'admin'

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false)
  }

  const navLinkClass = ({ isActive }) => {
    const base = 'block rounded-full px-4 py-2 text-sm font-medium transition'
    return isActive
      ? `${base} bg-blue-500/90 text-white shadow-lg shadow-blue-500/30`
      : `${base} text-blue-100/80 hover:bg-white/10 hover:text-white`
  }

  const visibleNavItems = useMemo(() => ([
    { to: '/dashboard', label: 'Panel', show: hasFeature('dashboard') },
    { to: '/calculator', label: 'Calculadora', show: hasFeature('calculator') },
    { to: '/invoices', label: 'Facturas', show: hasFeature('invoices') },
    { to: '/settings', label: 'Configuración', show: hasFeature('settings') || isAdmin },
    { to: '/admin/users', label: 'Usuarios', show: isAdmin }
  ]), [hasFeature, isAdmin])

  return (
    <div className="relative min-h-screen bg-slate-950 text-blue-100/80">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3 py-3 md:h-16 md:flex-nowrap md:gap-6">
            <div className="flex items-center">
                <Logo 
                  size="small" 
                  variant="white"
                  showText={true}
                  text="TravelEx"
                className="transition-transform hover:scale-105"
              />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-3 md:flex">
              {visibleNavItems.filter(item => item.show).map(item => (
                <NavLink key={item.to} to={item.to} className={navLinkClass}>{item.label}</NavLink>
              ))}
              <button 
                onClick={onLogout}
                className="rounded-full border border-red-400/40 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-300/70 hover:bg-red-500/10 hover:text-red-50"
              >
                Cerrar Sesión
              </button>
            </nav>
            
            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <button 
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center rounded-full bg-white/10 p-2 text-blue-100 transition hover:bg-white/20"
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
          <div className="md:hidden">
            <div className="mx-4 mt-2 rounded-2xl border border-white/10 bg-slate-900/90 p-2 shadow-xl shadow-blue-900/40">
              {visibleNavItems.filter(item => item.show).map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="block rounded-xl px-4 py-2 text-sm text-blue-100/80 transition hover:bg-white/10 hover:text-white"
                  onClick={closeMobileMenu}
                >
                  {item.label}
                </NavLink>
              ))}
              <button 
                onClick={(e) => {
                  closeMobileMenu();
                  onLogout(e);
                }}
                className="mt-2 block w-full rounded-xl px-4 py-2 text-left text-sm text-red-200 transition hover:bg-red-500/10 hover:text-red-50"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        )}
      </header>
      
      {/* Main Content */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-900/70 py-4">
        <div className="mx-auto max-w-7xl px-4 text-sm text-blue-200/80 sm:px-6 lg:px-8">
            <p className="text-center">
              &copy; {new Date().getFullYear()} JG TravelEx · Travel Experience
            </p>
        </div>
      </footer>
      
      {/* API Health Indicator */}
      <div className="absolute bottom-6 left-6 z-20">
        <ApiHealthIndicator />
      </div>
    </div>
  )
}

export default Layout