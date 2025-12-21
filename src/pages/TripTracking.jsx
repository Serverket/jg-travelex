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
  const filterOptions = [
    { id: 'day', label: 'Hoy' },
    { id: 'week', label: 'Esta Semana' },
    { id: 'month', label: 'Este Mes' },
    { id: 'all', label: 'Todos' }
  ]

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
  }, [filteredTrips, filteredOrders])

  const overviewStats = [
    { label: 'Total de Viajes', value: stats.totalTrips, suffix: '', accent: 'text-emerald-200' },
    { label: 'Total de Órdenes', value: stats.totalOrders, suffix: '', accent: 'text-blue-200' },
    { label: 'Distancia Total', value: `${stats.totalDistance} mi`, suffix: '', accent: 'text-sky-200' },
    { label: 'Ingresos Totales', value: `$${stats.totalRevenue}`, suffix: '', accent: 'text-amber-200' },
    { label: 'Distancia Promedio', value: `${stats.avgDistance} mi`, suffix: '', accent: 'text-fuchsia-200' },
    { label: 'Precio Promedio', value: `$${stats.avgPrice}`, suffix: '', accent: 'text-lime-200' }
  ]

  return (
    <div className="space-y-8">
      <div
        className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/5 backdrop-blur lg:flex-row lg:items-center lg:justify-between"
        data-aos="fade-up"
      >
        <div>
          <h1 className="text-3xl font-semibold text-white">Seguimiento de Viajes</h1>
          <p className="mt-2 max-w-3xl text-sm text-blue-100/70">
            Controle el rendimiento operacional con métricas en vivo, gráficos avanzados y tableros listos para la acción.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setFilter(option.id)}
              className={`rounded-xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap ${
                filter === option.id
                  ? 'border-blue-400/60 bg-blue-500/20 text-white shadow-inner shadow-blue-500/30'
                  : 'border-white/10 bg-white/5 text-blue-100/70 hover:border-blue-400/40 hover:bg-blue-500/15 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          data-aos="fade-up"
          className="rounded-3xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-sm text-rose-200"
        >
          {error}
        </div>
      )}

      <div
        className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
        data-aos="fade-up"
        data-aos-delay="80"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          {overviewStats.map((stat, index) => (
            <div
              key={stat.label}
              data-aos="fade-up"
              data-aos-delay={String(60 * index)}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-blue-500/10"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">{stat.label}</p>
              <p className={`mt-3 text-2xl font-semibold ${stat.accent}`}>{stat.value}{stat.suffix}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="120"
        >
          <h2 className="text-lg font-semibold text-white">Distancia por día</h2>
          <p className="mt-1 text-xs text-blue-100/60">Visualice la evolución diaria de distancias recorridas.</p>
          <div className="mt-4">
            {distanceData.labels.length > 0 ? (
              <Line
                data={distanceData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top', labels: { color: '#cbd5f5' } },
                    title: { display: false }
                  },
                  scales: {
                    x: { ticks: { color: '#9fb7ff' }, grid: { color: 'rgba(148, 163, 209, 0.15)' } },
                    y: { ticks: { color: '#9fb7ff' }, grid: { color: 'rgba(148, 163, 209, 0.15)' } }
                  }
                }}
              />
            ) : (
              <p className="py-10 text-center text-sm text-blue-100/60">No hay datos disponibles.</p>
            )}
          </div>
        </div>

        <div
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="160"
        >
          <h2 className="text-lg font-semibold text-white">Ingresos por día</h2>
          <p className="mt-1 text-xs text-blue-100/60">Compare los ingresos generados en el período seleccionado.</p>
          <div className="mt-4">
            {revenueData.labels.length > 0 ? (
              <Bar
                data={revenueData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'top', labels: { color: '#cbd5f5' } },
                    title: { display: false }
                  },
                  scales: {
                    x: { ticks: { color: '#9fb7ff' }, grid: { color: 'rgba(148, 163, 209, 0.15)' } },
                    y: { ticks: { color: '#9fb7ff' }, grid: { color: 'rgba(148, 163, 209, 0.15)' } }
                  }
                }}
              />
            ) : (
              <p className="py-10 text-center text-sm text-blue-100/60">No hay datos disponibles.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="200"
        >
          <h2 className="text-lg font-semibold text-white">Uso de factores de recargo</h2>
          <p className="mt-1 text-xs text-blue-100/60">Identifique qué recargos se aplican con mayor frecuencia.</p>
          <div className="mt-4 h-64">
            {surchargeData.labels.length > 0 ? (
              <Pie
                data={surchargeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'right', labels: { color: '#cbd5f5' } },
                    title: { display: false }
                  }
                }}
              />
            ) : (
              <p className="py-10 text-center text-sm text-blue-100/60">No hay datos disponibles.</p>
            )}
          </div>
        </div>

        <div
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="240"
        >
          <h2 className="text-lg font-semibold text-white">Viajes y órdenes</h2>
          <p className="mt-1 text-xs text-blue-100/60">Revise registros recientes y gestione acciones críticas.</p>
          <div className="mt-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, idx) => (
                  <div key={idx} className="h-9 w-full animate-pulse rounded-xl bg-white/5" />
                ))}
                <p className="text-xs text-blue-100/60">Cargando datos...</p>
              </div>
            ) : filteredTrips.length === 0 && filteredOrders.length === 0 ? (
              <p className="py-10 text-center text-sm text-blue-100/60">No hay viajes u órdenes registradas en este período.</p>
            ) : (
              <div className="space-y-6">
                {filteredTrips.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white">Viajes ({filteredTrips.length})</h3>
                    <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
                      <table className="min-w-full divide-y divide-white/10 text-left text-sm text-blue-100/80">
                        <thead className="bg-white/5 text-blue-100 text-sm uppercase tracking-[0.12em]">
                          <tr>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Fecha</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Origen</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Destino</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Distancia</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Precio</th>
                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredTrips.map((trip) => (
                            <tr
                              key={`trip-${trip.id}`}
                              className="bg-white/5"
                            >
                              <td className="px-4 py-3 text-sm text-blue-100/80">
                                {new Date(trip.trip_date || trip.created_at || trip.date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-blue-100/80">
                                {trip.origin_address || trip.origin || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-blue-100/80">
                                {trip.destination_address || trip.destination || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-white">
                                {trip.distance_miles || trip.distance || 0} mi
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-white whitespace-nowrap">
                                ${trip.final_price || trip.price || 0}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                <button
                                  onClick={() => handleDeleteTrip(trip)}
                                  className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20 hover:text-rose-100 whitespace-nowrap"
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

                {filteredOrders.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white">Órdenes ({filteredOrders.length})</h3>
                    <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
                      <table className="min-w-full divide-y divide-white/10 text-left text-sm text-blue-100/80">
                        <thead className="bg-white/5 text-blue-100 text-sm uppercase tracking-[0.12em]">
                          <tr>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Fecha</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Estado</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Total</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Usuario</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredOrders.map((order) => (
                            <tr
                              key={`order-${order.id}`}
                              className="bg-white/5"
                            >
                              <td className="px-4 py-3 text-sm text-blue-100/80">
                                {new Date(order.created_at || order.order_date).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span
                                  className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold shadow-inner shadow-blue-500/20 ${
                                    order.status === 'completed'
                                      ? 'bg-emerald-500/20 text-emerald-200'
                                      : order.status === 'pending'
                                        ? 'bg-amber-400/20 text-amber-100'
                                        : 'bg-rose-500/20 text-rose-200'
                                  }`}
                                >
                                  {order.status || 'pending'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-white whitespace-nowrap">
                                ${order.total_amount || 0}
                              </td>
                              <td className="px-4 py-3 text-sm text-blue-100/80">
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
    </div>
  )
}

export default TripTracking