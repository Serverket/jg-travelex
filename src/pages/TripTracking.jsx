import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { tripService } from '../services/tripService'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

const TripTracking = () => {
  const { currentUser, trips: contextTrips, setTrips: setContextTrips } = useAppContext()
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

  // Datos para gráficos
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

  // Usar viajes desde AppContext y cargar si es necesario
  useEffect(() => {
    if (contextTrips && contextTrips.length > 0) {
      console.log('Using trips from context:', contextTrips);
      setTrips(contextTrips);
      setLoading(false);
      return;
    }
    
    const fetchTrips = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching trips from API for user:', currentUser.id);
        const response = await tripService.getTripsByUserId(currentUser.id);
        console.log('Trips fetched:', response);
        setTrips(response);
        // Also update the AppContext trips
        setContextTrips(response);
      } catch (err) {
        console.error('Error al cargar viajes:', err);
        setError('Error al cargar los viajes. Por favor intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrips();
  }, [currentUser, contextTrips, setContextTrips]);

  // Filtrar viajes según el período seleccionado
  useEffect(() => {
    const now = new Date()
    let filtered = []

    switch (filter) {
      case 'day':
        // Viajes del día actual
        filtered = trips.filter(trip => {
          const tripDate = new Date(trip.date)
          return tripDate.toDateString() === now.toDateString()
        })
        break
      case 'week':
        // Viajes de la semana actual
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        weekStart.setHours(0, 0, 0, 0)
        
        filtered = trips.filter(trip => {
          const tripDate = new Date(trip.date)
          return tripDate >= weekStart
        })
        break
      case 'month':
        // Viajes del mes actual
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        
        filtered = trips.filter(trip => {
          const tripDate = new Date(trip.date)
          return tripDate >= monthStart
        })
        break
      default:
        // Todos los viajes
        filtered = [...trips]
    }

    setFilteredTrips(filtered)
  }, [trips, filter])

  // Calcular estadísticas basadas en los viajes filtrados
  useEffect(() => {
    if (filteredTrips.length === 0) {
      setStats({
        totalTrips: 0,
        totalDistance: 0,
        totalRevenue: 0,
        avgDistance: 0,
        avgPrice: 0
      })
      return
    }

    const totalTrips = filteredTrips.length
    const totalDistance = filteredTrips.reduce((sum, trip) => sum + parseFloat(trip.distance || 0), 0)
    const totalRevenue = filteredTrips.reduce((sum, trip) => sum + parseFloat(trip.price || 0), 0)

    setStats({
      totalTrips,
      totalDistance: totalDistance.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      avgDistance: (totalDistance / totalTrips).toFixed(2),
      avgPrice: (totalRevenue / totalTrips).toFixed(2)
    })

    // Preparar datos para gráficos
    prepareChartData()
  }, [filteredTrips])

  // Preparar datos para los gráficos
  const prepareChartData = () => {
    // Agrupar viajes por fecha
    const tripsByDate = filteredTrips.reduce((acc, trip) => {
      const date = new Date(trip.date).toLocaleDateString()
      if (!acc[date]) {
        acc[date] = {
          count: 0,
          distance: 0,
          revenue: 0
        }
      }
      acc[date].count += 1
      acc[date].distance += parseFloat(trip.distance || 0)
      acc[date].revenue += parseFloat(trip.price || 0)
      return acc
    }, {})

    // Convertir a arrays para los gráficos
    const dates = Object.keys(tripsByDate)
    const distances = dates.map(date => tripsByDate[date].distance.toFixed(2))
    const revenues = dates.map(date => tripsByDate[date].revenue.toFixed(2))

    // Gráfico de distancias
    setDistanceData({
      labels: dates,
      datasets: [
        {
          label: 'Distancia (millas)',
          data: distances,
          borderColor: 'rgb(53, 162, 235)',
          backgroundColor: 'rgba(53, 162, 235, 0.5)',
        },
      ],
    })

    // Gráfico de ingresos
    setRevenueData({
      labels: dates,
      datasets: [
        {
          label: 'Ingresos ($)',
          data: revenues,
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
        },
      ],
    })

    // Contar factores de recargo utilizados
    const surchargeCount = {}
    filteredTrips.forEach(trip => {
      if (trip.activeSurcharges && trip.activeSurcharges.length > 0) {
        trip.activeSurcharges.forEach(id => {
          if (!surchargeCount[id]) surchargeCount[id] = 0
          surchargeCount[id] += 1
        })
      }
    })

    // Preparar datos para el gráfico de factores de recargo
    const surchargeLabels = Object.keys(surchargeCount).map(id => `Factor ${id}`)
    const surchargeCounts = Object.values(surchargeCount)

    setSurchargeData({
      labels: surchargeLabels,
      datasets: [
        {
          label: 'Uso de factores de recargo',
          data: surchargeCounts,
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)',
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
          ],
          borderWidth: 1,
        },
      ],
    })
  }

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
      
      {/* Tarjetas de estadísticas */}
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
          
          {filteredTrips.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTrips.map((trip) => (
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
                        {trip.distance} mi
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
    </div>
  )
}

export default TripTracking