import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'
import { invoiceService } from '../services/invoiceService'

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const Dashboard = () => {
  const { user } = useAppContext()
  const [loading, setLoading] = useState(true)
  const [trips, setTrips] = useState([])
  const [orders, setOrders] = useState([])
  const [invoices, setInvoices] = useState([])
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalDistance: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    issuedInvoices: 0,
    paidInvoices: 0
  })

  // Datos para gráficos
  const [tripsByDay, setTripsByDay] = useState({
    labels: [],
    datasets: []
  })

  const [revenueByMonth, setRevenueByMonth] = useState({
    labels: [],
    datasets: []
  })

  // Load data with periodic refresh
  useEffect(() => {
    const loadData = async (isInitial = true) => {
      try {
        if (isInitial) {
          setLoading(true)
        }
        console.log('Dashboard: Starting data load for user:', user, 'Initial:', isInitial)
        const filters = user?.role === 'admin' ? { all: true } : { userId: user?.id }
        console.log('Dashboard: Using filters:', filters)
        
        const [tripsData, ordersData, invoicesData] = await Promise.all([
          tripService.getTrips(filters),
          orderService.getOrders(filters),
          invoiceService.getInvoices(filters)
        ])
        
        console.log('Dashboard: Loaded data:', { tripsData, ordersData, invoicesData })
        setTrips(tripsData || [])
        setOrders(ordersData || [])
        setInvoices(invoicesData || [])
      } catch (error) {
        console.error('Dashboard: Error loading data:', error)
        console.error('Dashboard: Error details:', {
          message: error.message,
          stack: error.stack,
          user: user
        })
      } finally {
        if (isInitial) {
          setLoading(false)
        }
      }
    }

    if (user) {
      console.log('Dashboard: User found, loading data...')
      // Initial data load with loading indicator
      loadData(true)
      
      // Set up periodic refresh every 10 seconds (silent background updates)
      const intervalId = setInterval(() => {
        console.log('Dashboard: Background data refresh triggered')
        loadData(false) // Silent refresh - no loading indicator
      }, 10000)
      
      // Cleanup interval on unmount
      return () => {
        console.log('Dashboard: Cleaning up refresh interval')
        clearInterval(intervalId)
      }
    } else {
      console.log('Dashboard: No user found, skipping data load')
    }
  }, [user])

  useEffect(() => {
    console.log('Dashboard: Recalculating stats with data:', { tripsLength: trips.length, ordersLength: orders.length, invoicesLength: invoices.length })
    // Calcular estadísticas generales
    const totalTrips = trips.length
    const totalDistance = trips.reduce((sum, trip) => sum + parseFloat(trip.distance_miles || trip.distance || 0), 0)
    const totalRevenue = trips.reduce((sum, trip) => sum + parseFloat(trip.final_price || trip.price || 0), 0)
    const pendingOrders = orders.filter(order => order.status === 'pending').length
    const completedOrders = orders.filter(order => order.status === 'completed').length
    const issuedInvoices = invoices.filter(invoice => invoice.status === 'issued').length
    const paidInvoices = invoices.filter(invoice => invoice.status === 'paid').length

    const newStats = {
      totalTrips,
      totalDistance: totalDistance.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      pendingOrders,
      completedOrders,
      issuedInvoices,
      paidInvoices
    }
    
    console.log('Dashboard: Setting new stats:', newStats)
    setStats(newStats)

    // Preparar datos para gráfico de viajes por día (últimos 7 días)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    const tripCounts = last7Days.map(day => {
      return trips.filter(trip => {
        const tripDate = trip.trip_date || trip.created_at || trip.date
        return tripDate && tripDate.split('T')[0] === day
      }).length
    })

    const newTripsByDay = {
      labels: last7Days.map(day => {
        const date = new Date(day)
        return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
      }),
      datasets: [
        {
          label: 'Viajes por día',
          data: tripCounts,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
      ],
    }
    
    console.log('Dashboard: Setting trips by day chart data:', newTripsByDay)
    setTripsByDay(newTripsByDay)

    // Preparar datos para gráfico de ingresos por mes (últimos 6 meses)
    const last6Months = [...Array(6)].map((_, i) => {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    }).reverse()

    const monthlyRevenue = last6Months.map(month => {
      const [year, monthNum] = month.split('-')
      return trips
        .filter(trip => {
          const tripDate = new Date(trip.trip_date || trip.created_at || trip.date)
          return tripDate.getFullYear() === parseInt(year) && tripDate.getMonth() + 1 === parseInt(monthNum)
        })
        .reduce((sum, trip) => sum + parseFloat(trip.final_price || trip.price || 0), 0)
    })

    const newRevenueByMonth = {
      labels: last6Months.map(month => {
        const [year, monthNum] = month.split('-')
        const date = new Date(parseInt(year), parseInt(monthNum) - 1)
        return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
      }),
      datasets: [
        {
          label: 'Ingresos por mes',
          data: monthlyRevenue,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
      ],
    }
    
    console.log('Dashboard: Setting revenue by month chart data:', newRevenueByMonth)
    setRevenueByMonth(newRevenueByMonth)
  }, [trips, orders, invoices])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-14 w-14 animate-spin rounded-full border-2 border-blue-400/60 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-10 text-slate-100">
      <div
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        data-aos="fade-up"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.45em] text-blue-300/70">Dashboard</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Tu Panel de Operaciones</h1>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-blue-100/80 shadow-lg shadow-blue-900/20">
          Bienvenido de nuevo, {user?.full_name || user?.username || 'Usuario'}
        </div>
      </div>
      
      {/* Tarjetas de estadísticas */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[{
          label: 'Total de Viajes',
          value: stats.totalTrips,
        }, {
          label: 'Distancia Total (millas)',
          value: stats.totalDistance,
        }, {
          label: 'Ingresos Totales ($)',
          value: stats.totalRevenue,
        }, {
          label: 'Órdenes Pendientes',
          value: stats.pendingOrders,
        }].map((item, index) => (
          <div
            key={item.label}
            data-aos="fade-up"
            data-aos-delay={String(80 * index)}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-lg shadow-blue-950/20 backdrop-blur-lg"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-blue-200/80">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {item.value}
            </p>
          </div>
        ))}
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-950/20 backdrop-blur-lg"
          data-aos="fade-up"
          data-aos-delay="100"
        >
          <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Viajes por Día (últimos 7 días)</h2>
          {tripsByDay.labels.length > 0 ? (
            <Line 
              data={tripsByDay} 
              options={{
                responsive: true,
                plugins: {
                  legend: { labels: { color: '#E2E8F0' }, position: 'top' },
                  title: { display: false }
                },
                scales: {
                  x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.2)' } },
                  y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.15)' } }
                }
              }} 
            />
          ) : (
            <p className="text-sm text-blue-200/70">Aún no hay suficientes datos para graficar.</p>
          )}
        </div>
        
        <div
          className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-950/20 backdrop-blur-lg"
          data-aos="fade-up"
          data-aos-delay="160"
        >
          <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Ingresos por Mes</h2>
          {revenueByMonth.labels.length > 0 ? (
            <Bar 
              data={revenueByMonth} 
              options={{
                responsive: true,
                plugins: {
                  legend: { labels: { color: '#E2E8F0' }, position: 'top' },
                  title: { display: false }
                },
                scales: {
                  x: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.15)' } },
                  y: { ticks: { color: '#94A3B8' }, grid: { color: 'rgba(148, 163, 184, 0.12)' } }
                }
              }} 
            />
          ) : (
            <p className="text-sm text-blue-200/70">Aún no hay suficientes datos para graficar.</p>
          )}
        </div>
      </div>
      
      {/* Actividad reciente */}
      <div
        className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-950/20 backdrop-blur-lg"
        data-aos="fade-up"
        data-aos-delay="220"
      >
        <h2 className="mb-4 text-lg font-semibold text-blue-100/90">Actividad Reciente</h2>
        
        {trips.length === 0 ? (
          <p className="text-sm text-blue-200/70">No hay viajes registrados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm text-slate-100">
              <thead className="bg-white/5 text-sm uppercase tracking-[0.12em] text-blue-200/80">
                <tr>
                  <th className="px-6 py-3 text-left whitespace-nowrap">Fecha</th>
                  <th className="px-6 py-3 text-left whitespace-nowrap">Origen</th>
                  <th className="px-6 py-3 text-left whitespace-nowrap">Destino</th>
                  <th className="px-6 py-3 text-left whitespace-nowrap">Distancia</th>
                  <th className="px-6 py-3 text-left whitespace-nowrap">Precio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {trips.slice(-5).reverse().map((trip) => (
                  <tr key={trip.id} className="transition hover:bg-white/5">
                    <td className="px-4 py-3 md:px-6">
                      {new Date(trip.trip_date || trip.created_at || trip.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 md:px-6">
                      {trip.origin_address || trip.origin || 'N/A'}
                    </td>
                    <td className="px-4 py-3 md:px-6">
                      {trip.destination_address || trip.destination || 'N/A'}
                    </td>
                    <td className="px-4 py-3 md:px-6">
                      {trip.distance_miles || trip.distance || 0} millas
                    </td>
                    <td className="px-4 py-3 md:px-6">
                      ${trip.final_price || trip.price || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard