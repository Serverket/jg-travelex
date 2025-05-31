import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend)

const Dashboard = () => {
  const { trips, orders, invoices } = useAppContext()
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

  useEffect(() => {
    // Calcular estadísticas generales
    const totalTrips = trips.length
    const totalDistance = trips.reduce((sum, trip) => sum + parseFloat(trip.distance || 0), 0)
    const totalRevenue = trips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0)
    const pendingOrders = orders.filter(order => order.status === 'pending').length
    const completedOrders = orders.filter(order => order.status === 'completed').length
    const issuedInvoices = invoices.filter(invoice => invoice.status === 'issued').length
    const paidInvoices = invoices.filter(invoice => invoice.status === 'paid').length

    setStats({
      totalTrips,
      totalDistance: totalDistance.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      pendingOrders,
      completedOrders,
      issuedInvoices,
      paidInvoices
    })

    // Preparar datos para gráfico de viajes por día (últimos 7 días)
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - i)
      return d.toISOString().split('T')[0]
    }).reverse()

    const tripCounts = last7Days.map(day => {
      return trips.filter(trip => trip.date.split('T')[0] === day).length
    })

    setTripsByDay({
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
    })

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
          const tripDate = new Date(trip.date)
          return tripDate.getFullYear() === parseInt(year) && tripDate.getMonth() + 1 === parseInt(monthNum)
        })
        .reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0)
    })

    setRevenueByMonth({
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
    })
  }, [trips, orders, invoices])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      
      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Total de Viajes</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.totalTrips}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Distancia Total (millas)</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.totalDistance}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Ingresos Totales ($)</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.totalRevenue}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Órdenes Pendientes</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.pendingOrders}</p>
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-700 font-medium mb-4">Viajes por Día (Últimos 7 días)</h2>
          {tripsByDay.labels.length > 0 && (
            <Line 
              data={tripsByDay} 
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false }
                }
              }} 
            />
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-700 font-medium mb-4">Ingresos por Mes</h2>
          {revenueByMonth.labels.length > 0 && (
            <Bar 
              data={revenueByMonth} 
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false }
                }
              }} 
            />
          )}
        </div>
      </div>
      
      {/* Actividad reciente */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-gray-700 font-medium mb-4">Actividad Reciente</h2>
        
        {trips.length === 0 ? (
          <p className="text-gray-500">No hay viajes registrados aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destino</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Distancia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trips.slice(-5).reverse().map((trip) => (
                  <tr key={trip.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(trip.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trip.origin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trip.destination}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {trip.distance} millas
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${trip.price}
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