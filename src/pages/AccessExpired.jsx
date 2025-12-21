import { Link, useLocation } from 'react-router-dom'

const contactEmail = 'sales@jgtravelex.com'

const plans = [
  {
    id: 'team',
    name: 'Plan Equipo',
    price: '$39 / mes',
    description: 'Pensado para operaciones que necesitan visibilidad completa y colaboración en tiempo real.',
    badge: 'Popular',
    highlight: true,
    ctaLabel: 'Hablar con Ventas',
    mailtoLabel: 'Plan Equipo',
    features: [
      'Usuarios ilimitados con control de roles',
      'Dashboard operativo en tiempo real',
      'Rastreo de viajes y cálculo de distancias sin límites',
      'Generación de facturas en PDF y reportes exportables',
      'Soporte prioritario con tiempos de respuesta de 1h'
    ]
  },
  {
    id: 'enterprise',
    name: 'Plan Corporativo',
    price: 'Personalizado',
    description: 'Cuando necesitas integraciones profundas y acompañamiento dedicado para equipos multi-sede.',
    badge: 'A medida',
    highlight: false,
    ctaLabel: 'Agendar una Demo',
    mailtoLabel: 'Plan Corporativo',
    features: [
      'Integración avanzada con APIs y sistemas internos',
      'SLAs dedicados y gerente de cuenta asignado',
      'Segmentación por sucursal y centros de costos',
      'Automatización de reportes contables',
      'Soporte 24/7 y capacitación a tu equipo'
    ]
  }
]

const buildMailto = (planName, emailHint) => {
  const subject = encodeURIComponent(`Activar ${planName} - JGEx`)
  const intro = emailHint ? `Mi correo registrado es ${emailHint}.` : 'Mi cuenta temporal ha expirado.'
  const body = encodeURIComponent(`Hola equipo JGEx,\n\nMe gustaría activar el ${planName}.\n${intro}\n\nGracias.`)
  return `mailto:${contactEmail}?subject=${subject}&body=${body}`
}

const AccessExpired = () => {
  const { state } = useLocation()
  const email = state?.email || ''

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div aria-hidden="true" className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-slate-900 to-slate-950" />
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute top-40 right-32 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <header className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-blue-300/80">Acceso temporal expirado</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Lleva tu operación al siguiente nivel con acceso completo a JGEx
          </h1>
          <p className="mt-6 text-base text-blue-100/90 sm:text-lg">
            Tu acceso temporal ha llegado a su fin, pero puedes seguir aprovechando la plataforma con uno de nuestros planes.
            Selecciona la opción que mejor se adapte a tu equipo y contáctanos para habilitarlo en minutos.
          </p>
          {email && (
            <p className="mt-4 text-sm text-blue-200/80">
              Detectamos el correo <span className="font-semibold text-white">{email}</span>. Lo incluiremos automáticamente cuando nos contactes.
            </p>
          )}
        </header>

        <main className="mt-16 grid flex-1 gap-8 md:grid-cols-2">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl ${plan.highlight ? 'ring-2 ring-blue-400/60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{plan.name}</h2>
                  <p className="mt-1 text-sm uppercase tracking-widest text-blue-300/80">Incluye</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-blue-100/90">
                  {plan.badge}
                </span>
              </div>

              <p className="mt-6 text-4xl font-bold text-white">{plan.price}</p>
              <p className="mt-2 text-sm text-blue-100/90">{plan.description}</p>

              <ul className="mt-6 space-y-3 text-sm text-blue-50">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-[6px] inline-block h-2 w-2 rounded-full bg-blue-400" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-10 flex flex-col gap-4">
                <a
                  href={buildMailto(plan.mailtoLabel, email)}
                  className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-400"
                >
                  {plan.ctaLabel}
                </a>
                <p className="text-xs text-blue-200/70">
                  Un especialista activará tu acceso completo y te ayudará con la configuración inicial.
                </p>
              </div>

              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 via-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </article>
          ))}
        </main>

        <footer className="mt-16 text-center text-sm text-blue-100/80">
          <p>
            ¿Necesitas volver a intentar con otra cuenta?{' '}
            <Link to="/login" className="font-semibold text-blue-300 hover:text-blue-200">
              Regresar a iniciar sesión
            </Link>
          </p>
        </footer>
      </div>
    </div>
  )
}

export default AccessExpired
