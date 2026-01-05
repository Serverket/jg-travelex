import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'

const REFRESH_INTERVAL_MS = 15000
const STALE_ACTIVE_TRIP_THRESHOLD_MS = 1000 * 60 * 60 * 3 // 3 hours without updates triggers alert

const numberFormatter = new Intl.NumberFormat('es-ES')
const milesFormatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' })

const ACTIVE_TRIP_STATUSES = new Set(['pending', 'confirmed', 'in_progress'])
const COMPLETED_TRIP_STATUSES = new Set(['completed'])

const STATUS_PRIORITY = {
  completed: 5,
  in_progress: 4,
  confirmed: 3,
  pending: 2,
  cancelled: 1,
  canceled: 1
}

const STATUS_LABELS = {
  completed: 'Completados',
  in_progress: 'En progreso',
  confirmed: 'Confirmados',
  pending: 'Pendientes',
  cancelled: 'Cancelados',
  other: 'Otros estados'
}

const STATUS_ACCENTS = {
  completed: 'border-emerald-400/30 bg-emerald-500/10',
  in_progress: 'border-sky-400/30 bg-sky-500/10',
  confirmed: 'border-indigo-400/30 bg-indigo-500/10',
  pending: 'border-amber-400/30 bg-amber-500/10',
  cancelled: 'border-rose-400/30 bg-rose-500/10',
  other: 'border-slate-400/20 bg-slate-500/5'
}

const initialSnapshot = {
  busy: true,
  error: null,
  metrics: {
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    totalMiles: 0,
    averageMiles: 0,
    totalRevenue: 0,
    pendingOrders: 0
  },
  statusInsights: [],
  operationalAlerts: [],
  updatedAt: null
}

const normalizeStatus = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '')

const fallbackId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `trip-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const pickTimestamp = (trip) => {
  const candidates = [trip?.trip_date, trip?.created_at, trip?.date, trip?.updated_at]
  for (const value of candidates) {
    if (!value) continue
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }
  return null
}

const coerceMiles = (trip) => {
  const rawMiles = Number.parseFloat(trip?.distance_miles ?? trip?.distance ?? trip?.distanceMiles)
  if (Number.isFinite(rawMiles) && rawMiles > 0) return rawMiles
  const rawKm = Number.parseFloat(trip?.distance_km ?? trip?.distanceKilometers)
  if (Number.isFinite(rawKm) && rawKm > 0) return rawKm * 0.621371
  return 0
}

const coerceDurationMinutes = (trip) => {
  const rawMinutes = Number.parseFloat(trip?.duration_minutes ?? trip?.durationMinutes)
  if (Number.isFinite(rawMinutes) && rawMinutes > 0) return rawMinutes
  const rawDuration = Number.parseFloat(trip?.duration ?? trip?.durationHours)
  if (Number.isFinite(rawDuration) && rawDuration > 0) return rawDuration * 60
  return 0
}

const formatDurationLabel = (minutes) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return null
  const wholeMinutes = Math.round(minutes)
  const hours = Math.floor(wholeMinutes / 60)
  const mins = wholeMinutes % 60
  if (hours > 0 && mins > 0) return `${hours} h ${mins} min`
  if (hours > 0) return `${hours} h`
  return `${wholeMinutes} min`
}

const relativeTimeFormatter = typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat !== 'undefined'
  ? new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })
  : null

const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Sin registro'
  const reference = new Date(isoString)
  if (Number.isNaN(reference.getTime())) return 'Sin registro'
  if (!relativeTimeFormatter) return reference.toLocaleString('es-ES')

  const diffMs = reference.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  const absMinutes = Math.abs(diffMinutes)

  if (absMinutes < 1) return 'Hace instantes'
  if (absMinutes < 60) return relativeTimeFormatter.format(diffMinutes, 'minute')

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) return relativeTimeFormatter.format(diffHours, 'hour')

  const diffDays = Math.round(diffHours / 24)
  return relativeTimeFormatter.format(diffDays, 'day')
}

const buildSnapshot = async (user) => {
  const baseFilters = user.role === 'admin'
    ? { all: true }
    : { userId: user.id, user_id: user.id }

  const [rawTrips, rawOrders] = await Promise.all([
    tripService.getTrips(baseFilters),
    orderService.getOrders(baseFilters)
  ])

  const trips = Array.isArray(rawTrips) ? rawTrips : []
  const orders = Array.isArray(rawOrders) ? rawOrders : []

  const orderStatusByTrip = new Map()
  const orderInfoByTrip = new Map()
  orders.forEach((order) => {
    const normalizedOrderStatus = normalizeStatus(order?.status)
    const priority = STATUS_PRIORITY[normalizedOrderStatus] ?? 0
    const items = Array.isArray(order?.order_items) ? order.order_items : []
    const amount = Number.parseFloat(order?.total_amount ?? order?.subtotal ?? order?.amount)
    const customerName = order?.customer_name ?? order?.client_name ?? order?.customer ?? null
    const reference = order?.order_number ?? order?.reference ?? null

    items.forEach((item) => {
      const tripId = item?.trip_id || item?.trip?.id || item?.trips?.id
      if (!tripId) return
      const current = orderStatusByTrip.get(tripId)
      if (!current || priority >= current.priority) {
        orderStatusByTrip.set(tripId, { status: normalizedOrderStatus, priority })
        orderInfoByTrip.set(tripId, {
          orderId: order?.id ?? null,
          amount: Number.isFinite(amount) ? amount : 0,
          customer: typeof customerName === 'string' ? customerName : null,
          reference
        })
      }
    })
  })

  const orderedTrips = trips
    .map((trip) => ({ raw: trip, timestamp: pickTimestamp(trip) }))
    .sort((a, b) => {
      const aTime = a.timestamp ? a.timestamp.getTime() : 0
      const bTime = b.timestamp ? b.timestamp.getTime() : 0
      return bTime - aTime
    })

  const aggregates = orderedTrips.reduce((acc, entry) => {
    const { raw } = entry
    const status = normalizeStatus(raw?.status)
    const override = orderStatusByTrip.get(raw?.id)
    const effectiveStatus = override?.status || status
    const miles = coerceMiles(raw)

    acc.totalTrips += 1
    acc.totalMiles += miles
    if (ACTIVE_TRIP_STATUSES.has(effectiveStatus)) acc.activeTrips += 1
    if (COMPLETED_TRIP_STATUSES.has(effectiveStatus)) acc.completedTrips += 1

    return acc
  }, {
    totalTrips: 0,
    activeTrips: 0,
    completedTrips: 0,
    totalMiles: 0
  })

  const averageMiles = aggregates.totalTrips
    ? aggregates.totalMiles / aggregates.totalTrips
    : 0

  const totalRevenue = orders.reduce((sum, order) => {
    const amount = Number.parseFloat(order?.total_amount ?? order?.subtotal ?? 0)
    return Number.isFinite(amount) ? sum + amount : sum
  }, 0)

  const pendingOrders = orders.reduce((count, order) => {
    const status = normalizeStatus(order?.status)
    return status && status !== 'completed' ? count + 1 : count
  }, 0)

  const statusBuckets = {
    completed: [],
    in_progress: [],
    confirmed: [],
    pending: [],
    cancelled: [],
    other: []
  }

  const operationalAlerts = []
  const now = Date.now()

  orderedTrips.forEach(({ raw, timestamp }) => {
    const status = normalizeStatus(raw?.status)
    const override = orderStatusByTrip.get(raw?.id)
    const effectiveStatus = override?.status || status || 'other'
    const normalizedEffectiveStatus = effectiveStatus === 'canceled' ? 'cancelled' : effectiveStatus
    const normalizedRawStatus = status === 'canceled' ? 'cancelled' : status
    const bucketKey = statusBuckets[normalizedEffectiveStatus] ? normalizedEffectiveStatus : 'other'
    const miles = coerceMiles(raw)
    const durationMinutes = coerceDurationMinutes(raw)
    const orderInfo = orderInfoByTrip.get(raw?.id)

    const detail = {
      id: raw?.id || raw?.trip_number || fallbackId(),
      origin: raw?.origin_address || raw?.origin || 'Origen no disponible',
      destination: raw?.destination_address || raw?.destination || 'Destino no disponible',
      miles,
      durationMinutes,
      lastUpdate: timestamp ? timestamp.toISOString() : null,
      order: orderInfo || null,
      status: normalizedEffectiveStatus,
      rawStatus: normalizedRawStatus || null
    }

    statusBuckets[bucketKey].push(detail)

    if (ACTIVE_TRIP_STATUSES.has(normalizedEffectiveStatus)) {
      const issues = []
      if (!override) issues.push('Sin pedido asociado')
      if (override && status && override.status !== normalizedRawStatus) issues.push('Estado de viaje distinto al pedido')
      if (!timestamp) {
        issues.push('Sin registro de última actualización')
      } else if (now - timestamp.getTime() > STALE_ACTIVE_TRIP_THRESHOLD_MS) {
        issues.push('Actualización pendiente hace más de 3 h')
      }
      if (miles <= 0 && durationMinutes <= 0) {
        issues.push('Sin distancia ni duración registradas')
      }
      if (issues.length > 0) {
        operationalAlerts.push({
          ...detail,
          issues
        })
      }
    }
  })

  const statusInsights = Object.entries(statusBuckets)
    .map(([key, items]) => {
      if (!items || items.length === 0) {
        return key === 'other' ? null : {
          status: key,
          label: STATUS_LABELS[key] || STATUS_LABELS.other,
          accent: STATUS_ACCENTS[key] || STATUS_ACCENTS.other,
          count: 0,
          averageMiles: 0,
          averageDuration: 0,
          totalRevenue: 0,
          sampleTrips: []
        }
      }

      const totalMiles = items.reduce((sum, item) => sum + (Number.isFinite(item.miles) ? item.miles : 0), 0)
      const totalDuration = items.reduce((sum, item) => sum + (Number.isFinite(item.durationMinutes) ? item.durationMinutes : 0), 0)
      const totalRevenue = items.reduce((sum, item) => sum + (item.order?.amount || 0), 0)

      return {
        status: key,
        label: STATUS_LABELS[key] || STATUS_LABELS.other,
        accent: STATUS_ACCENTS[key] || STATUS_ACCENTS.other,
        count: items.length,
        averageMiles: items.length ? totalMiles / items.length : 0,
        averageDuration: items.length ? totalDuration / items.length : 0,
        totalRevenue,
        sampleTrips: items.slice(0, 3)
      }
    })
    .filter(Boolean)
    .sort((a, b) => (STATUS_PRIORITY[b.status] ?? 0) - (STATUS_PRIORITY[a.status] ?? 0))

  operationalAlerts.sort((a, b) => {
    const scoreA = a.issues.length
    const scoreB = b.issues.length
    if (scoreA !== scoreB) return scoreB - scoreA
    const timeA = a.lastUpdate ? new Date(a.lastUpdate).getTime() : 0
    const timeB = b.lastUpdate ? new Date(b.lastUpdate).getTime() : 0
    return timeB - timeA
  })

  return {
    busy: false,
    error: null,
    metrics: {
      totalTrips: aggregates.totalTrips,
      activeTrips: aggregates.activeTrips,
      completedTrips: aggregates.completedTrips,
      totalMiles: aggregates.totalMiles,
      averageMiles,
      totalRevenue,
      pendingOrders
    },
    statusInsights,
    operationalAlerts,
    updatedAt: new Date().toISOString()
  }
}

const TripTracking = () => {
  const { currentUser, hasFeature } = useAppContext()
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const refreshTimer = useRef(null)
  const mountedRef = useRef(true)

  const canAccess = useMemo(() => {
    if (!currentUser) return false
    if (currentUser.role === 'admin') return true
    return hasFeature ? hasFeature('tracking') : true
  }, [currentUser, hasFeature])

  const hydrate = useCallback(async (silent = false) => {
    if (!currentUser) return

    if (!silent) {
      setSnapshot(prev => ({
        ...prev,
        busy: true,
        error: null
      }))
    }

    try {
      const nextSnapshot = await buildSnapshot(currentUser)
      if (mountedRef.current) {
        setSnapshot(nextSnapshot)
      }
    } catch (err) {
      if (mountedRef.current) {
        setSnapshot(prev => ({
          ...prev,
          busy: false,
          error: err?.message || 'No se pudo recuperar la información de viajes'
        }))
      }
    }
  }, [currentUser])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!canAccess) {
      setSnapshot(initialSnapshot)
      return undefined
    }

    hydrate(false)

    refreshTimer.current = setInterval(() => hydrate(true), REFRESH_INTERVAL_MS)
    return () => {
      if (refreshTimer.current) {
        clearInterval(refreshTimer.current)
      }
    }
  }, [canAccess, hydrate])

  const formattedMetrics = useMemo(() => ([
    {
      label: 'Viajes totales',
      value: numberFormatter.format(snapshot.metrics.totalTrips),
      hint: 'Historial acumulado'
    },
    {
      label: 'Viajes activos',
      value: numberFormatter.format(snapshot.metrics.activeTrips),
      hint: 'En curso o confirmados'
    },
    {
      label: 'Viajes completados',
      value: numberFormatter.format(snapshot.metrics.completedTrips),
      hint: 'Finalizados con éxito'
    },
    {
      label: 'Millas totales',
      value: `${milesFormatter.format(snapshot.metrics.totalMiles)} mi`,
      hint: 'Incluye conversiones de km'
    },
    {
      label: 'Millas promedio',
      value: `${milesFormatter.format(snapshot.metrics.averageMiles)} mi`,
      hint: 'Promedio por viaje'
    },
    {
      label: 'Ingresos',
      value: currencyFormatter.format(snapshot.metrics.totalRevenue),
      hint: snapshot.metrics.pendingOrders
        ? `${snapshot.metrics.pendingOrders} órdenes pendientes`
        : 'Sin órdenes pendientes'
    }
  ]), [snapshot.metrics])

  if (!canAccess) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-blue-100/70">
        No tienes permisos para visualizar el seguimiento de viajes.
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-blue-500/10 backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Seguimiento Operativo</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100/70">
              Información esencial de viajes con actualizaciones automáticas cada 15 segundos.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs text-blue-200/70">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 ${
              snapshot.busy
                ? 'border-indigo-400/40 bg-indigo-500/10 text-indigo-100'
                : 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
            }`}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {snapshot.busy ? 'Actualizando…' : 'Sincronizado'}
            </span>
            {snapshot.updatedAt && (
              <span>Última actualización: {dateFormatter.format(new Date(snapshot.updatedAt))}</span>
            )}
            <button
              type="button"
              onClick={() => hydrate(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-blue-100/80 transition hover:border-blue-400/40 hover:bg-blue-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50"
            >
              Refrescar ahora
            </button>
          </div>
        </div>
        {snapshot.error && (
          <div className="mt-4 rounded-2xl border border-rose-400/40 bg-rose-500/15 px-4 py-3 text-sm text-rose-100">
            {snapshot.error}
          </div>
        )}
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {formattedMetrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-3xl border border-white/10 bg-slate-900/50 px-5 py-6 shadow-inner shadow-blue-500/10"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-blue-200/70">{metric.label}</p>
            <p className="mt-3 text-2xl font-semibold text-white">{metric.value}</p>
            <p className="mt-2 text-xs text-blue-200/60">{metric.hint}</p>
          </article>
        ))}
      </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-blue-500/10 backdrop-blur">
          <header className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Monitoreo detallado</h2>
              <p className="text-sm text-blue-100/70">Desglose por estado con métricas operativas y los focos más recientes.</p>
            </div>
          </header>

          {snapshot.statusInsights.length === 0 ? (
            <p className="mt-6 text-sm text-blue-100/60">Todavía no hay datos para mostrar el detalle por estado.</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {snapshot.statusInsights.map((insight) => (
                <article
                  key={insight.status}
                  className={`rounded-2xl border px-5 py-5 shadow-inner shadow-blue-500/10 ${insight.accent}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-blue-200/70">{insight.label}</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{numberFormatter.format(insight.count)}</p>
                    </div>
                    <div className="text-right text-xs text-blue-200/60">
                      <p>Media millas: {milesFormatter.format(insight.averageMiles || 0)} mi</p>
                      <p>Media duración: {formatDurationLabel(insight.averageDuration) || '—'}</p>
                      <p>Ingresos vinculados: {currencyFormatter.format(insight.totalRevenue || 0)}</p>
                    </div>
                  </div>

                  {insight.sampleTrips.length === 0 ? (
                    <p className="mt-4 text-xs text-blue-200/60">Sin viajes destacados en este estado.</p>
                  ) : (
                    <ul className="mt-5 space-y-3">
                      {insight.sampleTrips.map((trip) => {
                        const primaryMetric = trip.miles > 0
                          ? `${milesFormatter.format(trip.miles)} mi`
                          : formatDurationLabel(trip.durationMinutes) || 'Sin datos'
                        return (
                          <li
                            key={trip.id}
                            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-blue-50/90"
                          >
                            <div className="flex flex-col gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-white">
                                  {trip.origin}
                                  <span className="mx-2 text-blue-200/60">→</span>
                                  {trip.destination}
                                </p>
                                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs text-blue-100/80">
                                  {primaryMetric}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-blue-200/70">
                                <span>{trip.lastUpdate ? formatRelativeTime(trip.lastUpdate) : 'Sin registro'}</span>
                                {trip.order?.reference && (
                                  <span>Pedido {trip.order.reference}</span>
                                )}
                                {!trip.order?.reference && trip.order?.orderId && (
                                  <span>Pedido #{trip.order.orderId}</span>
                                )}
                                {trip.order?.customer && (
                                  <span>Cliente: {trip.order.customer}</span>
                                )}
                                {trip.order?.amount > 0 && (
                                  <span>Monto: {currencyFormatter.format(trip.order.amount)}</span>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>

        {snapshot.operationalAlerts.length > 0 && (
          <section className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 shadow-lg shadow-rose-500/15 backdrop-blur">
            <header className="flex flex-col gap-2 border-b border-rose-200/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">Alertas operativas</h2>
                <p className="text-sm text-rose-100/80">Viajes activos que requieren seguimiento inmediato.</p>
              </div>
              <span className="rounded-full border border-rose-200/30 bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-50/90">
                {snapshot.operationalAlerts.length} pendientes
              </span>
            </header>

            <ul className="mt-5 space-y-3">
              {snapshot.operationalAlerts.map((alert) => {
                const primaryMetric = alert.miles > 0
                  ? `${milesFormatter.format(alert.miles)} mi`
                  : formatDurationLabel(alert.durationMinutes) || 'Sin datos'
                return (
                  <li
                    key={alert.id}
                    className="rounded-2xl border border-rose-200/30 bg-rose-500/10 px-4 py-4 text-sm text-rose-50/90"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-semibold text-white">
                          {alert.origin}
                          <span className="mx-2 text-rose-100/70">→</span>
                          {alert.destination}
                        </p>
                        <p className="text-xs text-rose-100/70">{alert.lastUpdate ? formatRelativeTime(alert.lastUpdate) : 'Sin registro'}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full border border-rose-200/30 bg-rose-500/20 px-2 py-1 text-rose-50/90">
                          {primaryMetric}
                        </span>
                        {alert.order?.reference && (
                          <span className="rounded-full border border-rose-200/30 bg-rose-500/20 px-2 py-1 text-rose-50/90">Pedido {alert.order.reference}</span>
                        )}
                        {!alert.order?.reference && alert.order?.orderId && (
                          <span className="rounded-full border border-rose-200/30 bg-rose-500/20 px-2 py-1 text-rose-50/90">Pedido #{alert.order.orderId}</span>
                        )}
                        {alert.order?.amount > 0 && (
                          <span className="rounded-full border border-rose-200/30 bg-rose-500/20 px-2 py-1 text-rose-50/90">Monto: {currencyFormatter.format(alert.order.amount)}</span>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {alert.issues.map((issue) => (
                        <span
                          key={issue}
                          className="rounded-full border border-rose-200/40 bg-rose-900/40 px-3 py-1 text-rose-100"
                        >
                          {issue}
                        </span>
                      ))}
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
    </div>
  )
}

export default TripTracking
