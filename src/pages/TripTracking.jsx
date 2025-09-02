import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { useToast } from '../context/ToastContext'

// Chart.js registration
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement)

const TripTracking = () => {
  const { user } = useAppContext()
  const toast = useToast()
  const [trips, setTrips] = useState([])
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('week') // 'day', 'week', 'month', 'all'
  const [filteredTrips, setFilteredTrips] = useState([])
  const [filteredOrders, setFilteredOrders] = useState([])
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalOrders: 0,
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

  // Load trips and orders with periodic refresh
  useEffect(() => {
    const fetchData = async (isInitial = true) => {
      if (!user) return;
      
      try {
        if (isInitial) {
          setLoading(true);
        }
        setError(null);
        console.log('TripTracking: Fetching data for user:', user.id, 'Initial:', isInitial);
        
        const filters = user.role === 'admin' ? { all: true } : { userId: user.id };
        
        const [tripsResponse, ordersResponse] = await Promise.all([
          tripService.getTrips(filters),
          orderService.getOrders(filters)
        ]);
        
        console.log('TripTracking: Data fetched:', { trips: tripsResponse?.length, orders: ordersResponse?.length });
        setTrips(tripsResponse || []);
        setOrders(ordersResponse || []);
      } catch (err) {
        console.error('TripTracking: Error loading data:', err);
        if (isInitial) {
          setError('Error al cargar los datos. Por favor intente nuevamente.');
        }
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    };
    
    if (user) {
      // Initial fetch with loading indicator
      fetchData(true);
      
      // Set up periodic refresh every 10 seconds (silent background updates)
      const intervalId = setInterval(() => {
        console.log('TripTracking: Background data refresh triggered');
        fetchData(false); // Silent refresh - no loading indicator
      }, 10000);
      
      // Cleanup interval on unmount
      return () => {
        console.log('TripTracking: Cleaning up refresh interval');
        clearInterval(intervalId);
      };
    }
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

  // Filter trips and orders by selected period
  useEffect(() => {
    console.log('TripTracking: Filtering data with filter:', filter, 'Total trips:', trips.length, 'Total orders:', orders.length)
    
    if (trips.length > 0) {
      console.log('TripTracking: Sample trip data:', trips[0])
    }
    if (orders.length > 0) {
      console.log('TripTracking: Sample order data:', orders[0])
    }
    
    const now = new Date()
    let filteredTripsResult = []
    let filteredOrdersResult = []

    // Helper function to filter items by date
    const filterByDateRange = (items, dateFieldPrimary, dateFieldSecondary, startDate, endDate) => {
      return items.filter(item => {
        const itemDateRaw = item[dateFieldPrimary] || item[dateFieldSecondary] || item.created_at
        if (!itemDateRaw) {
          console.log('TripTracking: Item has no date:', item)
          return false
        }
        
        const itemDate = new Date(itemDateRaw)
        const matches = itemDate >= startDate && itemDate <= endDate
        
        if (matches) {
          console.log('TripTracking: Item matches filter:', item, 'Date:', itemDate.toDateString())
        }
        
        return matches
      })
    }

    switch (filter) {
      case 'day':
        {
          // Today only
          const dayStart = new Date(now)
          dayStart.setHours(0, 0, 0, 0)
          const dayEnd = new Date(now) 
          dayEnd.setHours(23, 59, 59, 999)
          
          console.log('TripTracking: Filtering for today:', dayStart.toDateString())
          
          filteredTripsResult = filterByDateRange(trips, 'trip_date', 'date', dayStart, dayEnd)
          filteredOrdersResult = filterByDateRange(orders, 'created_at', 'order_date', dayStart, dayEnd)
          break
        }
        
      case 'week':
        {
          // Current week (Sunday to Saturday)
          const weekStart = new Date(now)
          weekStart.setDate(now.getDate() - now.getDay())
          weekStart.setHours(0, 0, 0, 0)
          
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          weekEnd.setHours(23, 59, 59, 999)
          
          console.log('TripTracking: Filtering for week:', weekStart.toDateString(), 'to', weekEnd.toDateString())
          
          filteredTripsResult = filterByDateRange(trips, 'trip_date', 'date', weekStart, weekEnd)
          filteredOrdersResult = filterByDateRange(orders, 'created_at', 'order_date', weekStart, weekEnd)
          break
        }
        
      case 'month':
        {
          // Current month
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
          
          console.log('TripTracking: Filtering for month:', monthStart.toDateString(), 'to', monthEnd.toDateString())
          
          filteredTripsResult = filterByDateRange(trips, 'trip_date', 'date', monthStart, monthEnd)
          filteredOrdersResult = filterByDateRange(orders, 'created_at', 'order_date', monthStart, monthEnd)
          break
        }
        
      default:
        // All data
        filteredTripsResult = [...trips]
        filteredOrdersResult = [...orders]
    }

    console.log('TripTracking: Filtered result:', filteredTripsResult.length, 'trips,', filteredOrdersResult.length, 'orders')
    setFilteredTrips(filteredTripsResult)
    setFilteredOrders(filteredOrdersResult)
  }, [trips, orders, filter])

  // Compute stats and prepare chart data when filtered data changes
  useEffect(() => {
    if (filteredTrips.length === 0 && filteredOrders.length === 0) {
      setStats({
        totalTrips: 0,
        totalOrders: 0,
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
    const totalOrders = filteredOrders.length
    const totalDistance = filteredTrips.reduce((sum, trip) => sum + parseFloat(trip.distance_miles || trip.distance || 0), 0)
    const tripRevenue = filteredTrips.reduce((sum, trip) => sum + parseFloat(trip.final_price || trip.price || 0), 0)
    const orderRevenue = filteredOrders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0)
    const totalRevenue = tripRevenue + orderRevenue

    setStats({
      totalTrips,
      totalOrders,
      totalDistance: totalDistance.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      avgDistance: totalTrips > 0 ? (totalDistance / totalTrips).toFixed(2) : '0.00',
      avgPrice: totalTrips > 0 ? (tripRevenue / totalTrips).toFixed(2) : '0.00'
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Total de Viajes</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.totalTrips}</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-gray-500 text-sm font-medium">Total de Órdenes</h2>
          <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
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
          <h2 className="text-gray-700 font-medium mb-4">Viajes y Órdenes</h2>
          
          {loading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="animate-pulse">
                  <div className="h-10 bg-gray-100 rounded" />
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2">Cargando datos...</p>
            </div>
          ) : filteredTrips.length === 0 && filteredOrders.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No hay viajes u órdenes registradas en este período</p>
          ) : (
            <div className="space-y-6">
              {/* Viajes */}
              {filteredTrips.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Viajes ({filteredTrips.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Origen</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Distancia</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Precio</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredTrips.map((trip) => (
                          <tr key={`trip-${trip.id}`}>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(trip.trip_date || trip.created_at || trip.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {trip.origin_address || trip.origin || 'N/A'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {trip.destination_address || trip.destination || 'N/A'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {trip.distance_miles || trip.distance || 0} mi
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              ${trip.final_price || trip.price || 0}
                            </td>
                            <td className="px-4 py-2 text-right text-sm">
                              <button
                                onClick={() => handleDeleteTrip(trip)}
                                className="text-red-600 hover:text-red-800 text-xs"
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Órdenes */}
              {filteredOrders.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Órdenes ({filteredOrders.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredOrders.map((order) => (
                          <tr key={`order-${order.id}`}>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(order.created_at || order.order_date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {order.status || 'pending'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              ${order.total_amount || 0}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {order.user_name || order.username || 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TripTracking