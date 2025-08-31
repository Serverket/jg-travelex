import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { tripService } from '../services/tripService'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { useToast } from '../context/ToastContext'

// Chart.js registration
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

const TripTracking = () => {
  const { user } = useAppContext()
  const toast = useToast()
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('week') // 'day', 'week', 'month', 'all'
  const [filteredTrips, setFilteredTrips] = useState([])
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalDistance: 0,
    totalRevenue: 0,
    avgDistance: 0,
    avgPrice: 0
  })

  // Chart data state
  const [distanceData, setDistanceData] = useState({
    labels: [],
    datasets: []
  })

  const [revenueData, setRevenueData] = useState({
    labels: [],
    datasets: []
  })

  const [surchargeData, setSurchargeData] = useState({
    labels: [],
    datasets: []
  })

  // Load trips
  useEffect(() => {
    const fetchTrips = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching trips for user:', user.id);
        
        let response = [];
        if (user.role === 'admin') {
          // Admin sees all trips
          response = await tripService.getTrips({ all: true });
        } else {
          // Regular user sees only own trips
          response = await tripService.getTrips({ userId: user.id });
        }
        
        console.log('Trips fetched:', response);
        setTrips(response);
      } catch (err) {
        console.error('Error al cargar viajes:', err);
        setError('Error al cargar los viajes. Por favor intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrips();
  }, [user]);

  // Delete a trip with confirmation
  const handleDeleteTrip = async (trip) => {
    if (!trip?.id) {
      toast.error('Viaje inválido.');
      return;
    }
    const origin = trip.origin_address || trip.origin || 'Origen';
    const destination = trip.destination_address || trip.destination || 'Destino';
    const confirmed = window.confirm(`¿Eliminar viaje de "${origin}" a "${destination}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    try {
      await tripService.deleteTrip(trip.id);
      setTrips(prev => prev.filter(t => t.id !== trip.id));
      toast.success('Viaje eliminado correctamente');
    } catch (err) {
      console.error('Error deleting trip:', err);
      const message = err?.message || 'No se pudo eliminar el viaje. Intente nuevamente.';
      toast.error(message);
    }
  }

  // Filter trips by selected period
  useEffect(() => {
    const now = new Date()
    let filtered = []

    switch (filter) {
      case 'day':
        // Viajes del día actual
        filtered = trips.filter(trip => {
          const tripDate = new Date(trip.trip_date || trip.created_at || trip.date)
          return tripDate.toDateString() === now.toDateString()
        })
        break
      case 'week':
        {
          // Current week
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          
          filtered = trips.filter(trip => {
            const tripDate = new Date(trip.trip_date || trip.created_at || trip.date)
            return tripDate >= weekStart
          })
          break
        }
      case 'month':
        {
          // Current month
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          
          filtered = trips.filter(trip => {
            const tripDate = new Date(trip.trip_date || trip.created_at || trip.date)
            return tripDate >= monthStart
          })
          break
        }
      default:
        // All trips
        filtered = [...trips]
    }

    setFilteredTrips(filtered)
  }, [trips, filter])

  // Compute stats and prepare chart data when filtered trips change
  useEffect(() => {
    if (filteredTrips.length === 0) {
      setStats({
        totalTrips: 0,
        totalDistance: 0,
        totalRevenue: 0,
        avgDistance: 0,
        avgPrice: 0
      })
      // Clear charts when no data
      setDistanceData({ labels: [], datasets: [] })
      setRevenueData({ labels: [], datasets: [] })
      setSurchargeData({ labels: [], datasets: [] })
      return
    }

    const totalTrips = filteredTrips.length
    const totalDistance = filteredTrips.reduce((sum, trip) => sum + parseFloat(trip.distance_miles || trip.distance || 0), 0)
    const totalRevenue = filteredTrips.reduce((sum, trip) => sum + parseFloat(trip.final_price || trip.price || 0), 0)

    setStats({
      totalTrips,
      totalDistance: totalDistance.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      avgDistance: (totalDistance / totalTrips).toFixed(2),
      avgPrice: (totalRevenue / totalTrips).toFixed(2)
    })

    // Charts: group by date
    const tripsByDate = filteredTrips.reduce((acc, trip) => {
      const date = new Date(trip.trip_date || trip.created_at || trip.date).toLocaleDateString()
      if (!acc[date]) acc[date] = { count: 0, distance: 0, revenue: 0 }
      acc[date].count += 1
      acc[date].distance += parseFloat(trip.distance_miles || trip.distance || 0)
      acc[date].revenue += parseFloat(trip.final_price || trip.price || 0)
      return acc
    }, {})

    const dates = Object.keys(tripsByDate)
    const distances = dates.map(date => tripsByDate[date].distance.toFixed(2))
    const revenues = dates.map(date => tripsByDate[date].revenue.toFixed(2))

    setDistanceData({
      labels: dates,
      datasets: [{
        label: 'Distancia (millas)',
        data: distances,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)'
      }]
    })

    setRevenueData({
      labels: dates,
      datasets: [{
        label: 'Ingresos ($)',
        data: revenues,
        backgroundColor: 'rgba(75, 192, 192, 0.5)'
      }]
    })

    // Charts: surcharge usage
    const surchargeCount = {}
    filteredTrips.forEach(trip => {
      if (trip.activeSurcharges && trip.activeSurcharges.length > 0) {
        trip.activeSurcharges.forEach(id => {
          if (!surchargeCount[id]) surchargeCount[id] = 0
          surchargeCount[id] += 1
        })
      }
    })

    const surchargeLabels = Object.keys(surchargeCount).map(id => `Factor ${id}`)
    const surchargeCounts = Object.values(surchargeCount)

    setSurchargeData({
      labels: surchargeLabels,
      datasets: [{
        label: 'Uso de factores de recargo',
        data: surchargeCounts,
        backgroundColor: [
          'rgba(255, 99, 132, 0.5)',
          'rgba(54, 162, 235, 0.5)',
          'rgba(255, 206, 86, 0.5)',
          'rgba(75, 192, 192, 0.5)',
          'rgba(153, 102, 255, 0.5)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)'
        ],
        borderWidth: 1
      }]
    })
  }, [filteredTrips])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Seguimiento de Viajes</h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('day')}
            className={`px-3 py-1 text-sm rounded-md ${filter === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Hoy
          </button>
          <button
            onClick={() => setFilter('week')}
            className={`px-3 py-1 text-sm rounded-md ${filter === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => setFilter('month')}
            className={`px-3 py-1 text-sm rounded-md ${filter === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Este Mes
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-md ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Todos
          </button>
        </div>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
          {error}
        </div>
      )}
      
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Total de Viajes</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.totalTrips}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Distancia Total</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.totalDistance} mi</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Ingresos Totales</h2>
          <p className="text-2xl font-bold text-gray-800">${stats.totalRevenue}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Distancia Promedio</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.avgDistance} mi</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Precio Promedio</h2>
          <p className="text-2xl font-bold text-gray-800">${stats.avgPrice}</p>
        </div>
      </div>
      
      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-700 font-medium mb-4">Distancia por Día</h2>
          {distanceData.labels.length > 0 ? (
            <Line 
              data={distanceData} 
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false }
                }
              }} 
            />
          ) : (
            <p className="text-gray-500 text-center py-10">No hay datos disponibles</p>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-700 font-medium mb-4">Ingresos por Día</h2>
          {revenueData.labels.length > 0 ? (
            <Bar 
              data={revenueData} 
              options={{
                responsive: true,
                plugins: {
                  legend: { position: 'top' },
                  title: { display: false }
                }
              }} 
            />
          ) : (
            <p className="text-gray-500 text-center py-10">No hay datos disponibles</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-700 font-medium mb-4">Uso de Factores de Recargo</h2>
          {surchargeData.labels.length > 0 ? (
            <div className="h-64">
              <Pie 
                data={surchargeData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right' },
                    title: { display: false }
                  }
                }} 
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-10">No hay datos disponibles</p>
          )}
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-700 font-medium mb-4">Detalles de Viajes</h2>
          
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="animate-pulse">
                  <div className="h-10 bg-gray-100 rounded" />
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">Cargando viajes...</p>
            </div>
          ) : filteredTrips.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No hay viajes registrados en este período</p>
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
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrips.map((trip) => (
                    <tr key={trip.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(trip.trip_date || trip.created_at || trip.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trip.origin_address || trip.origin || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trip.destination_address || trip.destination || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {trip.distance_miles || trip.distance || 0} mi
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${trip.final_price || trip.price || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteTrip(trip)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TripTracking