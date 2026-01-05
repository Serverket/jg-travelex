import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppContext } from '../context/AppContext'
import { tripService } from '../services/tripService'
import { orderService } from '../services/orderService'

const REFRESH_INTERVAL_MS = 15000
const RECENT_LIMIT = 6

const numberFormatter = new Intl.NumberFormat('es-ES')
const milesFormatter = new Intl.NumberFormat('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
const dateFormatter = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' })

const ACTIVE_TRIP_STATUSES = new Set(['pending', 'confirmed', 'in_progress'])
const COMPLETED_TRIP_STATUSES = new Set(['completed'])

const STATUS_THEME = {
  completed: 'border-emerald-400/40 bg-emerald-500/15 text-emerald-100',
  in_progress: 'border-sky-400/40 bg-sky-500/15 text-sky-100',
  confirmed: 'border-indigo-400/40 bg-indigo-500/15 text-indigo-100',
  pending: 'border-amber-400/40 bg-amber-500/15 text-amber-100',
  cancelled: 'border-rose-400/40 bg-rose-500/15 text-rose-100',
  canceled: 'border-rose-400/40 bg-rose-500/15 text-rose-100'
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
  recentTrips: [],
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
    const miles = coerceMiles(raw)

    acc.totalTrips += 1
    acc.totalMiles += miles
    if (ACTIVE_TRIP_STATUSES.has(status)) acc.activeTrips += 1
    if (COMPLETED_TRIP_STATUSES.has(status)) acc.completedTrips += 1

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

  const recentTrips = orderedTrips
    .slice(0, RECENT_LIMIT)
    .map(({ raw, timestamp }) => ({
      id: raw?.id || raw?.trip_number || fallbackId(),
      origin: raw?.origin_address || raw?.origin || 'Origen no disponible',
      destination: raw?.destination_address || raw?.destination || 'Destino no disponible',
      miles: coerceMiles(raw),
      status: normalizeStatus(raw?.status) || 'sin estado',
      timestamp
    }))

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
    recentTrips,
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
            <h2 className="text-xl font-semibold text-white">Últimos viajes</h2>
            <p className="text-sm text-blue-100/70">Resumen de los {Math.min(snapshot.recentTrips.length, RECENT_LIMIT)} viajes más recientes.</p>
          </div>
        </header>

        {snapshot.recentTrips.length === 0 ? (
          <p className="mt-6 text-sm text-blue-100/60">No se encontraron viajes recientes.</p>
        ) : (
          <ul className="mt-6 space-y-3">
            {snapshot.recentTrips.map((trip) => (
              <li
                key={trip.id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 transition hover:border-blue-400/40 hover:bg-blue-500/10 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-white">
                    {trip.origin}
                    <span className="mx-2 text-blue-200/60">→</span>
                    {trip.destination}
                  </p>
                  {trip.timestamp && (
                    <p className="mt-1 text-xs text-blue-200/60">
                      {dateFormatter.format(trip.timestamp)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm font-semibold text-blue-100">
                    {milesFormatter.format(trip.miles)} mi
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                      STATUS_THEME[trip.status] || 'border-white/15 bg-white/10 text-blue-100/80'
                    }`}
                  >
                    {trip.status === 'completed'
                      ? 'Completado'
                      : trip.status === 'canceled' || trip.status === 'cancelled'
                        ? 'Cancelado'
                        : trip.status === 'confirmed'
                          ? 'Confirmado'
                          : trip.status === 'in_progress'
                            ? 'En progreso'
                            : 'Pendiente'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default TripTracking
