import { useState, useEffect, useMemo } from 'react'
import { useAppContext } from '../context/AppContext'
import { orderService } from '../services/orderService'
import { tripService } from '../services/tripService'
import { invoiceService } from '../services/invoiceService'
import ShareModal from '../components/ShareModal'
import {
  formatDurationBilingual,
  formatPriceLabel,
  buildShareMessage,
  buildWhatsAppLink,
  buildMailtoLink,
  ensureBilingualLocation
} from '../utils/share'

const Orders = () => {
  const { user } = useAppContext()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [orderStatusFilter, setOrderStatusFilter] = useState('all') // 'all', 'pending', 'completed', 'cancelled'
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc' // Newest first by default
  })
  const [lastUpdated, setLastUpdated] = useState(null)
  const [shareContext, setShareContext] = useState({ open: false, mode: 'whatsapp', payload: null })

  // Load orders with periodic refresh
  useEffect(() => {
    const fetchOrders = async (isInitial = true) => {
      if (!user) return;
      
      try {
        if (isInitial) {
          setLoading(true);
        }
        setError(null);
        
        // Fetch orders based on user role
        let fetchedOrders = [];
        if (user.role === 'admin') {
          // Admin sees all orders - pass all: true directly
          fetchedOrders = await orderService.getOrders({ all: true });
        } else {
          // Regular users see only their orders
          fetchedOrders = await orderService.getOrders({ user_id: user.id });
        }
        
        console.log('Fetched orders:', fetchedOrders);
        
        // Fetch trip data for each order
        const ordersWithTrips = await Promise.all(
          fetchedOrders.map(async (order) => {
            try {
              // Get order items to find associated trips
              const orderItems = await orderService.getOrderItems(order.id);
              const trips = await Promise.all(
                orderItems.map(item => tripService.getTripById(item.trip_id))
              );
              return { ...order, trips, orderItems };
            } catch (err) {
              console.error('Error fetching trip data for order:', order.id, err);
              return { ...order, trips: [], orderItems: [] };
            }
          })
        );
        
  setOrders(ordersWithTrips);
  setLastUpdated(new Date());
      } catch (err) {
        console.error('Error loading orders:', err);
        if (isInitial) {
          setError('Error al cargar pedidos. Por favor intente nuevamente.');
        }
      } finally {
        if (isInitial) {
          setLoading(false);
        }
      }
    };
    
    if (user) {
      // Initial fetch with loading indicator
      fetchOrders(true);
      
      // Set up periodic refresh every 10 seconds (silent background updates)
      const intervalId = setInterval(() => {
        console.log('Orders: Background data refresh triggered');
        fetchOrders(false); // Silent refresh - no loading indicator
      }, 10000);
      
      // Cleanup interval on unmount
      return () => {
        console.log('Orders: Cleaning up refresh interval');
        clearInterval(intervalId);
      };
    }
  }, [user]);

  const filteredOrders = useMemo(() => {
    if (orderStatusFilter === 'all') return orders
    return orders.filter(order => {
      const status = (order.status || '').toLowerCase()
      if (orderStatusFilter === 'cancelled') {
        return status === 'cancelled' || status === 'canceled'
      }
      return status === orderStatusFilter
    })
  }, [orders, orderStatusFilter])

  const currencyFormatter = useMemo(() => new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD'
  }), [])

  const orderInsights = useMemo(() => {
    if (!filteredOrders || filteredOrders.length === 0) {
      return {
        total: 0,
        pending: 0,
        completed: 0,
        canceled: 0,
        revenue: 0,
        average: 0,
        completionRate: 0
      }
    }

    return filteredOrders.reduce((acc, order) => {
      const status = (order.status || 'pending').toLowerCase()
      const amount = parseFloat(order.total_amount || 0) || 0

      acc.total += 1
      acc.revenue += amount

      if (status === 'completed') {
        acc.completed += 1
      } else if (status === 'cancelled' || status === 'canceled') {
        acc.canceled += 1
      } else {
        acc.pending += 1
      }

      return acc
    }, {
      total: 0,
      pending: 0,
      completed: 0,
      canceled: 0,
      revenue: 0,
      average: 0,
      completionRate: 0
    })
  }, [filteredOrders])

  const enrichedOrderInsights = useMemo(() => {
    const average = orderInsights.total ? orderInsights.revenue / orderInsights.total : 0
    const completionRate = orderInsights.total ? (orderInsights.completed / orderInsights.total) * 100 : 0

    return {
      ...orderInsights,
      average,
      completionRate
    }
  }, [orderInsights])

  // Sort function that works for both orders and invoices
  const sortedItems = (items) => {
    if (!items || items.length === 0) return [];
    return [...items].sort((a, b) => {
      if (sortConfig.key === 'date') {
        const dateA = a.created_at || new Date().toISOString();
        const dateB = b.created_at || new Date().toISOString();
        return sortConfig.direction === 'asc' 
          ? new Date(dateA) - new Date(dateB)
          : new Date(dateB) - new Date(dateA);
      } else if (sortConfig.key === 'price') {
        const priceA = a.total_amount || 0;
        const priceB = b.total_amount || 0;
        return sortConfig.direction === 'asc' ? priceA - priceB : priceB - priceA;
      }
      return 0;
    });
  };

  const sortedOrders = useMemo(() => sortedItems(filteredOrders), [filteredOrders, sortConfig])

  const formattedLastUpdated = useMemo(() => {
    if (!lastUpdated) return null
    return `${lastUpdated.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
  }, [lastUpdated])

  const extractTripShareData = (trip, orderFallbackAmount) => {
    if (!trip) {
      return {
        origin: ensureBilingualLocation(null),
        destination: ensureBilingualLocation(null),
        duration: formatDurationBilingual({ minutes: null }),
        price: formatPriceLabel(orderFallbackAmount)
      }
    }

    const origin = ensureBilingualLocation(trip.origin_address || trip.origin)
    const destination = ensureBilingualLocation(trip.destination_address || trip.destination)
    const durationMinutes = Number.isFinite(trip.duration_minutes)
      ? Number(trip.duration_minutes)
      : (() => {
          const rawDuration = trip.duration
          if (rawDuration == null) return null
          const numeric = Number.parseFloat(rawDuration)
          return Number.isFinite(numeric) ? numeric * 60 : null
        })()
    const durationLabel = formatDurationBilingual({ minutes: durationMinutes })
    const priceValue = trip.final_price ?? trip.price ?? orderFallbackAmount
    const priceLabel = formatPriceLabel(priceValue)

    return {
      origin,
      destination,
      duration: durationLabel,
      price: priceLabel
    }
  }

  const handleOpenShare = (mode, payload) => {
    setShareContext({ open: true, mode, payload })
  }

  const handleCloseShare = () => {
    setShareContext((prev) => ({ ...prev, open: false, payload: null }))
  }

  const handleSubmitShare = (recipient) => {
    if (!shareContext.payload) {
      handleCloseShare()
      return
    }
    const message = buildShareMessage(shareContext.payload)
    const link = shareContext.mode === 'whatsapp'
      ? buildWhatsAppLink(recipient, message)
      : buildMailtoLink(recipient, message)

    const target = shareContext.mode === 'whatsapp' ? '_blank' : '_self'
    window.open(link, target, 'noopener')
    handleCloseShare()
  }

  const shareMessagePreview = shareContext.payload ? buildShareMessage(shareContext.payload) : ''

  const WhatsAppIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <path
        d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75 0 1.722.45 3.338 1.237 4.736L2.25 21.75l5.184-1.212A9.708 9.708 0 0 0 12 21.75c5.385 0 9.75-4.365 9.75-9.75s-4.365-9.75-9.75-9.75Z"
        strokeLinecap="round"
      />
      <path
        d="M8.97 9.332c.248-.536.59-.553.802-.553.211 0 .424-.005.612.287.248.372.79 1.159.87 1.236.08.077.132.18.026.316-.106.136-.398.458-.516.607-.137.17-.28.192-.51.064-.23-.128-.972-.358-1.852-1.106-.685-.59-1.147-1.319-1.282-1.548-.134-.23-.014-.354.115-.466.118-.1.264-.26.396-.408.132-.148.185-.248.264-.408Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  )

  const MailIcon = (props) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" {...props}>
      <rect x="3.75" y="5.25" width="16.5" height="13.5" rx="2.25" />
      <path d="m4.5 6 7.38 6.15a1.125 1.125 0 0 0 1.44 0L20.7 6" />
    </svg>
  )

  const metricCards = useMemo(() => ([
    {
      label: 'Pedidos visibles',
      value: enrichedOrderInsights.total,
      helper: orderStatusFilter === 'all' ? 'Total general' : 'Coinciden con el filtro activo',
      border: 'border-sky-400/40',
      shadow: 'shadow-sky-500/20'
    },
    {
      label: 'Ingresos estimados',
      value: currencyFormatter.format(enrichedOrderInsights.revenue || 0),
      helper: enrichedOrderInsights.total ? 'Acumulado en pedidos listados' : 'Sin pedidos en el rango',
      border: 'border-indigo-400/40',
      shadow: 'shadow-indigo-500/20'
    },
    {
      label: 'Ticket promedio',
      value: enrichedOrderInsights.total ? currencyFormatter.format(enrichedOrderInsights.average || 0) : currencyFormatter.format(0),
      helper: enrichedOrderInsights.total ? 'Promedio por pedido visible' : 'Esperando nuevos pedidos',
      border: 'border-emerald-400/40',
      shadow: 'shadow-emerald-500/20'
    },
    {
      label: 'Estado actual',
      value: `${Math.round(enrichedOrderInsights.completionRate)}% completado`,
      helper: `Pendientes: ${enrichedOrderInsights.pending} · Cancelados: ${enrichedOrderInsights.canceled}`,
      border: 'border-amber-400/40',
      shadow: 'shadow-amber-500/20'
    }
  ]), [currencyFormatter, enrichedOrderInsights, orderStatusFilter])

  // Handle column header click for sorting
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key 
        ? prevConfig.direction === 'asc' ? 'desc' : 'asc'
        : key === 'date' ? 'desc' : 'asc' // Default to newest first for dates
    }));
  };

  const canonicalizeOrderStatus = (status) => {
    const value = (status || '').toLowerCase()
    switch (value) {
      case 'canceled':
        return 'cancelled'
      case 'in_progress':
        return 'processing'
      default:
        return value
    }
  }

  const mapOrderStatusToTripStatus = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'completed':
        return 'completed'
      case 'canceled':
      case 'cancelled':
      case 'refunded':
        return 'cancelled'
      case 'confirmed':
      case 'approved':
        return 'confirmed'
      case 'in_progress':
      case 'processing':
        return 'in_progress'
      case 'draft':
      case 'pending':
      default:
        return 'pending'
    }
  }

  // Handle order status update
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const dbStatus = canonicalizeOrderStatus(newStatus)
      const tripStatus = mapOrderStatusToTripStatus(dbStatus)
      const existingOrder = orders.find(o => o.id === orderId)
      const tripIds = existingOrder?.orderItems?.map(item => item.trip_id).filter(Boolean) || []

      await orderService.updateOrder(orderId, { status: dbStatus });
      
      if (tripIds.length) {
        await Promise.all(tripIds.map(tripId => tripService.updateTrip(tripId, { status: tripStatus })));
      }

      // Update local state
      setOrders(prevOrders => 
        prevOrders.map(order => {
          if (order.id !== orderId) return order
          const updatedTrips = Array.isArray(order.trips)
            ? order.trips.map(trip => (
                tripIds.includes(trip.id)
                  ? { ...trip, status: tripStatus }
                  : trip
              ))
            : order.trips
          return { ...order, status: dbStatus, trips: updatedTrips }
        })
      );
      
      // If order is completed, create an invoice
      if (dbStatus === 'completed') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const currentDate = new Date();
          const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
          const invoiceData = {
            order_id: orderId,
            invoice_date: currentDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            status: 'pending'
          };
          await invoiceService.createInvoice(invoiceData);
        }
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Error al actualizar el estado del pedido');
    }
  };

  return (
    <>
    <div className="space-y-8">
      <div
        className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/5 backdrop-blur"
        data-aos="fade-up"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Gestión de Pedidos</h1>
            <p className="mt-1 text-sm text-blue-100/70">Supervise el ciclo completo de pedidos con estado en vivo y acciones rápidas.</p>
          </div>
          <div className="flex flex-col gap-2 text-sm text-blue-100/70 md:text-right">
            <span className="font-medium uppercase tracking-wide text-blue-200/70">Filtrar por estado</span>
            <select
              value={orderStatusFilter}
              onChange={(event) => setOrderStatusFilter(event.target.value)}
              className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white shadow-inner shadow-blue-500/10 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 md:w-64"
            >
              <option value="all" className="bg-slate-900">Todos los pedidos</option>
              <option value="pending" className="bg-slate-900">Pendientes</option>
              <option value="completed" className="bg-slate-900">Completados</option>
              <option value="cancelled" className="bg-slate-900">Cancelados</option>
            </select>
            {formattedLastUpdated && (
              <span className="text-xs text-blue-200/60">Actualizado {formattedLastUpdated}</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card, index) => (
          <div
            key={card.label}
            data-aos="fade-up"
            data-aos-delay={String(80 * index)}
            className={`rounded-3xl border ${card.border} bg-white/5 p-5 text-blue-100/80 shadow-2xl ${card.shadow} backdrop-blur`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-200/70">{card.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{card.value}</p>
            <p className="mt-2 text-xs text-blue-100/60">{card.helper}</p>
          </div>
        ))}
      </div>

      <div
        className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 shadow-2xl shadow-blue-500/10 backdrop-blur"
        data-aos="fade-up"
        data-aos-delay="120"
      >
        <div className="border-b border-white/10 px-6 py-5">
          <h2 className="text-xl font-semibold text-white">Pedidos</h2>
          <p className="mt-1 text-sm text-blue-100/70">Visualice los pedidos recientes, revise sus viajes asociados y modifique estados.</p>
        </div>

        {loading && (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            <p className="mt-3 text-sm text-blue-100/70">Cargando pedidos...</p>
          </div>
        )}

        {error && (
          <div className="px-6 py-6 text-center text-sm text-rose-300">{error}</div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-blue-100/60">No se encontraron pedidos para los filtros aplicados.</div>
        )}

        {!loading && !error && filteredOrders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm text-blue-100/80">
              <thead className="bg-white/5 text-blue-100 text-sm uppercase tracking-[0.12em]">
                <tr>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Pedido #</th>
                  <th
                    className="px-6 py-4 font-semibold whitespace-nowrap transition hover:bg-white/5"
                    onClick={() => handleSort('date')}
                  >
                    <span className="flex items-center gap-2">
                      Fecha
                      {sortConfig.key === 'date' && (
                        <span className="text-xs">
                          {sortConfig.direction === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Viajes</th>
                  <th
                    className="px-6 py-4 font-semibold whitespace-nowrap transition hover:bg-white/5"
                    onClick={() => handleSort('price')}
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      Monto Total
                      {sortConfig.key === 'price' && (
                        <span className="text-xs">
                          {sortConfig.direction === 'asc' ? '▲' : '▼'}
                        </span>
                      )}
                    </span>
                  </th>
                  <th className="px-6 py-4 font-semibold whitespace-nowrap">Estado</th>
                  {user?.role === 'admin' && (
                    <th className="px-6 py-4 font-semibold whitespace-nowrap">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sortedOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="bg-white/5"
                  >
                    <td className="px-6 py-4 text-sm font-semibold text-white">#{order.id.slice(0, 8)}</td>
                    <td className="px-6 py-4 text-sm text-blue-100/80">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-blue-100/70">
                      <div className="max-w-xs space-y-2 md:max-w-md">
                        {order.trips?.length > 0 ? (
                          order.trips.map((trip, index) => (
                            <div key={index} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-blue-100/80">
                              {trip.origin} <span className="mx-1 text-blue-200/60">→</span> {trip.destination}
                            </div>
                          ))
                        ) : (
                          <span className="text-blue-200/50">Sin viajes asociados</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white whitespace-nowrap">
                      ${parseFloat(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold shadow-inner shadow-blue-500/20 ${
                          order.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-200'
                            : order.status === 'cancelled' || order.status === 'canceled'
                              ? 'bg-rose-500/20 text-rose-200'
                              : 'bg-amber-400/20 text-amber-100'
                        }`}
                      >
                        {order.status === 'completed'
                          ? 'Completado'
                          : order.status === 'cancelled' || order.status === 'canceled'
                            ? 'Cancelado'
                            : order.status === 'processing' || order.status === 'in_progress'
                              ? 'En progreso'
                              : order.status === 'approved'
                                ? 'Confirmado'
                                : 'Pendiente'}
                      </span>
                    </td>
                    {user?.role === 'admin' && (
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {order.status === 'pending' || order.status === 'draft' ? (
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={() => updateOrderStatus(order.id, 'completed')}
                                className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-200 transition hover:bg-emerald-500/20 hover:text-emerald-100 whitespace-nowrap"
                              >
                                Completar
                              </button>
                              <button
                                onClick={() => updateOrderStatus(order.id, 'cancelled')}
                                className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-sm font-medium text-rose-200 transition hover:bg-rose-500/20 hover:text-rose-100 whitespace-nowrap"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-blue-200/60">Sin acciones</span>
                          )}
                          {(() => {
                            const primaryTrip = order.trips?.[0] || order.items?.[0]?.tripData
                            const sharePayload = extractTripShareData(primaryTrip, order.total_amount)
                            return (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleOpenShare('whatsapp', sharePayload)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/15 text-emerald-200 transition hover:bg-emerald-500/25"
                                  title="Compartir por WhatsApp / Share via WhatsApp"
                                  aria-label="Compartir por WhatsApp / Share via WhatsApp"
                                >
                                  <WhatsAppIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenShare('email', sharePayload)}
                                  className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/15 text-blue-100 transition hover:bg-blue-500/25"
                                  title="Compartir por correo / Share via email"
                                  aria-label="Compartir por correo / Share via email"
                                >
                                  <MailIcon className="h-4 w-4" />
                                </button>
                              </div>
                            )
                          })()}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    <ShareModal
      open={shareContext.open}
      mode={shareContext.mode}
      onClose={handleCloseShare}
      onSubmit={handleSubmitShare}
      messagePreview={shareMessagePreview}
    />
    </>
  )
}

export default Orders
