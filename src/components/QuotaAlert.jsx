const QuotaAlert = ({ status }) => {
  if (!status) return null
  const max = Math.max(status.autocomplete.percent, status.directions.percent)
  if (max < 70) return null

  const isCritical = max >= 90
  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${isCritical
      ? 'border-red-400/30 bg-red-500/15 text-red-100'
      : 'border-yellow-400/30 bg-yellow-500/15 text-yellow-100'}`}>
      <p className="font-semibold">
        {isCritical
          ? 'Alerta: Quota de Google Maps casi agotada. Reduzca el uso para evitar cargos.'
          : 'Advertencia: Quota de Google Maps llegando al 70%.'}
      </p>
    </div>
  )
}

export default QuotaAlert
