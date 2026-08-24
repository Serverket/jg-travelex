import { useState, useEffect, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { useApiUsageLogs } from '../hooks/useApiUsageLogs'
import { backendService } from '../services/backendService'
import { useToast } from '../context/ToastContext'
import ConfirmDialog from '../components/ConfirmDialog'

const Settings = () => {
  const { 
    rateSettings, 
    refreshSettings,
    addSurchargeFactor, 
    addDiscount, 
    deleteSurchargeFactor, 
    deleteDiscount, 
    isLoading, 
    error: contextError,
    currentUser,
    hasFeature
  } = useAppContext()
  const isAdmin = currentUser?.role === 'admin'
  const toast = useToast()
  
  // Estado local para editar configuraciones con valores por defecto seguros
  const [editedSettings, setEditedSettings] = useState({
    distanceRate: 1.5,
    durationRate: 15,
    defaultMpg: 35,
    defaultFuelPrice: 4.00,
    defaultStopIntervalHours: 4.00,
    preferredStopBrands: 'Wawa, Racetrack, Circle K',
    surchargeFactors: [],
    discounts: []
  })
  
  // Estado para nuevos factores y descuentos
  const [newSurchargeFactor, setNewSurchargeFactor] = useState({
    name: '',
    rate: '',
    type: 'percentage'
  })
  
  const [newDiscount, setNewDiscount] = useState({
    name: '',
    rate: '',
    type: 'percentage'
  })

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [localLoading, setLocalLoading] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const isSavingRef = useRef(false)
  
  // Reset editedSettings when rateSettings change (only if not dirty and not currently saving)
  useEffect(() => {
    if (rateSettings && !localLoading && !isDirty) {
      setEditedSettings({ 
        distanceRate: rateSettings.distanceRate !== undefined ? rateSettings.distanceRate : 1.5,
        durationRate: rateSettings.durationRate !== undefined ? rateSettings.durationRate : 15,
        defaultMpg: rateSettings.defaultMpg !== undefined ? rateSettings.defaultMpg : 35,
        defaultFuelPrice: rateSettings.defaultFuelPrice !== undefined ? rateSettings.defaultFuelPrice : 4.00,
        defaultStopIntervalHours: rateSettings.defaultStopIntervalHours !== undefined ? rateSettings.defaultStopIntervalHours : 4.00,
        preferredStopBrands: rateSettings.preferredStopBrands || 'Wawa, Racetrack, Circle K',
        surchargeFactors: rateSettings.surchargeFactors || [],
        discounts: rateSettings.discounts || [] 
      })
    }
  }, [rateSettings, localLoading, isDirty])

  // Efecto para mostrar errores del contexto
  useEffect(() => {
    if (contextError) {
      setErrorMessage(contextError)
    }
  }, [contextError])

  // Manejar cambios en las tarifas base
  const handleBaseRateChange = (e) => {
    setIsDirty(true)
    const { name, value } = e.target
    setEditedSettings(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value) || 0
    }))
  }

  // Manejar cambios en los factores de recargo existentes
  const handleSurchargeChange = (id, field, value) => {
    setIsDirty(true)
    setEditedSettings(prev => ({
      ...prev,
      surchargeFactors: (prev.surchargeFactors || []).map(factor => 
        factor.id === id ? { ...factor, [field]: field === 'rate' ? (value === '' ? '' : parseFloat(value) || 0) : value } : factor
      )
    }))
  }

  // Manejar cambios en los descuentos existentes
  const handleDiscountChange = (id, field, value) => {
    setIsDirty(true)
    setEditedSettings(prev => ({
      ...prev,
      discounts: (prev.discounts || []).map(discount => 
        discount.id === id ? { ...discount, [field]: field === 'rate' ? (value === '' ? '' : parseFloat(value) || 0) : value } : discount
      )
    }))
  }

  // Manejar cambios en el nuevo factor de recargo (esto no ensucia settings globales)
  const handleNewSurchargeChange = (e) => {
    const { name, value } = e.target
    setNewSurchargeFactor(prev => ({
      ...prev,
      [name]: name === 'rate' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }))
  }

  // Manejar cambios en el nuevo descuento
  const handleNewDiscountChange = (e) => {
    const { name, value } = e.target
    setNewDiscount(prev => ({
      ...prev,
      [name]: name === 'rate' ? (value === '' ? '' : parseFloat(value) || 0) : value
    }))
  }
  // Guardar cambios en las configuraciones
  const saveSettings = async (settingsToSave = editedSettings) => {
    isSavingRef.current = true
    try {
      setLocalLoading(true)
      setErrorMessage('')
      
      // 1. Guardar cambios de tarifas base y variables de rendimiento
      await backendService.updateSettings({
        distance_rate: parseFloat(settingsToSave.distanceRate) || 0,
        duration_rate: parseFloat(settingsToSave.durationRate) || 0,
        default_mpg: parseFloat(settingsToSave.defaultMpg) || 0,
        default_fuel_price: parseFloat(settingsToSave.defaultFuelPrice) || 0,
        default_stop_interval_hours: parseFloat(settingsToSave.defaultStopIntervalHours) || 0,
        preferred_stop_brands: String(settingsToSave.preferredStopBrands || '')
      })
      
      // 2. Guardar cambios en factores de recargo en paralelo
      if (settingsToSave.surchargeFactors && settingsToSave.surchargeFactors.length > 0) {
        await Promise.all(
          settingsToSave.surchargeFactors.map(factor => {
            if (factor && factor.id) {
              return backendService.updateSurchargeFactor(factor.id, {
                name: factor.name || '',
                rate: parseFloat(factor.rate) || 0,
                type: factor.type || 'percentage'
              })
            }
            return Promise.resolve()
          })
        )
      }
      
      // 3. Guardar cambios en descuentos en paralelo
      if (settingsToSave.discounts && settingsToSave.discounts.length > 0) {
        await Promise.all(
          settingsToSave.discounts.map(discount => {
            if (discount && discount.id) {
              return backendService.updateDiscount(discount.id, {
                name: discount.name || '',
                rate: parseFloat(discount.rate) || 0,
                type: discount.type || 'percentage'
              })
            }
            return Promise.resolve()
          })
        )
      }
      
      // 4. Re-fetch único desde el servidor para sincronizar AppContext y toda la UI
      // Reset isDirty BEFORE refreshSettings so the sync useEffect can fire
      // when rateSettings arrives with the updated values
      setIsDirty(false)
      isSavingRef.current = false
      await refreshSettings()
      
      setSuccessMessage('Configuraciones guardadas automáticamente')
      setErrorMessage('')
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      console.error('Error al guardar configuraciones:', error)
      setErrorMessage('Error al guardar las configuraciones: ' + (error.message || 'Error desconocido'))
      setSuccessMessage('')
      isSavingRef.current = false
    } finally {
      setLocalLoading(false)
    }
  }

  // Auto-guardado
  useEffect(() => {
    if (!isDirty) return;
    
    const timer = setTimeout(() => {
      saveSettings(editedSettings)
    }, 1500)
    
    return () => clearTimeout(timer)
  }, [editedSettings, isDirty])

  // Añadir nuevo factor de recargo
  const handleAddSurchargeFactor = async () => {
    if (!newSurchargeFactor.name || !newSurchargeFactor.rate) {
      setErrorMessage('Por favor complete todos los campos del factor de recargo')
      return
    }
    
    try {
      setLocalLoading(true)
      await addSurchargeFactor({
        name: newSurchargeFactor.name,
        rate: parseFloat(newSurchargeFactor.rate),
        type: newSurchargeFactor.type
      })
      
      // Limpiar formulario
      setNewSurchargeFactor({
        name: '',
        rate: '',
        type: 'percentage'
      })
      
      setSuccessMessage('Factor de recargo añadido correctamente')
      setErrorMessage('')
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      setErrorMessage('Error al añadir el factor de recargo: ' + (error.message || 'Error desconocido'))
      setSuccessMessage('')
    } finally {
      setLocalLoading(false)
    }
  }

  // Añadir nuevo descuento
  const handleAddDiscount = async () => {
    if (!newDiscount.name || !newDiscount.rate) {
      setErrorMessage('Por favor complete todos los campos del descuento')
      return
    }
    
    try {
      setLocalLoading(true)
      await addDiscount({
        name: newDiscount.name,
        rate: parseFloat(newDiscount.rate),
        type: newDiscount.type
      })
      
      // Limpiar formulario
      setNewDiscount({
        name: '',
        rate: '',
        type: 'percentage'
      })
      
      setSuccessMessage('Descuento añadido correctamente')
      setErrorMessage('')
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      setErrorMessage('Error al añadir el descuento: ' + (error.message || 'Error desconocido'))
      setSuccessMessage('')
    } finally {
      setLocalLoading(false)
    }
  }

  // Eliminar un factor de recargo
  const handleRemoveSurchargeFactor = async (id) => {
    try {
      setLocalLoading(true)
      await deleteSurchargeFactor(id)
      setSuccessMessage('Factor de recargo eliminado correctamente')
      setErrorMessage('')
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      setErrorMessage('Error al eliminar el factor de recargo: ' + (error.message || 'Error desconocido'))
      setSuccessMessage('')
    } finally {
      setLocalLoading(false)
    }
  }

  // Eliminar un descuento
  const handleRemoveDiscount = async (id) => {
    try {
      setLocalLoading(true)
      await deleteDiscount(id)
      setSuccessMessage('Descuento eliminado correctamente')
      setErrorMessage('')
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      setErrorMessage('Error al eliminar el descuento: ' + (error.message || 'Error desconocido'))
      setSuccessMessage('')
    } finally {
      setLocalLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <div
        className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl shadow-blue-500/5 backdrop-blur"
        data-aos="fade-up"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">Configuración de Tarifas</h1>
            <p className="mt-2 max-w-3xl text-sm text-blue-100/70">
              Ajuste las tarifas base y administre factores dinámicos para personalizar la estrategia de precios en tiempo real.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-slate-900/60 px-5 py-4 text-sm text-blue-100/70 shadow-inner shadow-blue-500/10">
            <p className="font-semibold text-blue-100">Sincronización automática</p>
            <p className="mt-1 text-xs text-blue-200/70">Las tarifas guardadas se aplican inmediatamente a los cálculos de viaje.</p>
          </div>
        </div>
        {successMessage && (
          <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="80"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Tarifas Base</h2>
            <p className="mt-1 text-sm text-blue-100/70">Defina los montos globales para cálculos por distancia y duración.</p>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="distanceRate" className="block text-sm font-semibold text-blue-100/80">Tarifa por Milla ($)</label>
              <input
                type="number"
                id="distanceRate"
                name="distanceRate"
                value={editedSettings.distanceRate ?? ''}
                onChange={handleBaseRateChange}
                min="0"
                step="0.01"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label htmlFor="durationRate" className="block text-sm font-semibold text-blue-100/80">Tarifa por Hora ($)</label>
              <input
                type="number"
                id="durationRate"
                name="durationRate"
                value={editedSettings.durationRate ?? ''}
                onChange={handleBaseRateChange}
                min="0"
                step="0.01"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label htmlFor="minTripCharge" className="block text-sm font-semibold text-blue-100/80">Tarifa Mínima por Viaje ($)</label>
              <input
                type="number"
                id="minTripCharge"
                name="minTripCharge"
                value={editedSettings.minTripCharge ?? ''}
                onChange={handleBaseRateChange}
                min="0"
                step="0.01"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <button
              onClick={saveSettings}
              disabled={localLoading || isLoading}
              className="w-full rounded-xl border border-blue-400/50 bg-blue-500/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-blue-200/50"
            >
              {(localLoading || isLoading) ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>

        </div>

        <div
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="100"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Combustible y Paradas por Defecto</h2>
            <p className="mt-1 text-sm text-blue-100/70">Configure las variables de rendimiento de combustible e intervalos sugeridos de descanso para viajes largos.</p>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="defaultMpg" className="block text-sm font-semibold text-blue-100/80">Rendimiento (MPG)</label>
                <input
                  type="number"
                  id="defaultMpg"
                  name="defaultMpg"
                  value={editedSettings.defaultMpg ?? ''}
                  onChange={(e) => { setIsDirty(true); setEditedSettings(prev => ({ ...prev, defaultMpg: parseFloat(e.target.value) || 0 })) }}
                  min="1"
                  step="0.1"
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label htmlFor="defaultFuelPrice" className="block text-sm font-semibold text-blue-100/80">Precio Gasolina ($/Gal)</label>
                <input
                  type="number"
                  id="defaultFuelPrice"
                  name="defaultFuelPrice"
                  value={editedSettings.defaultFuelPrice ?? ''}
                  onChange={(e) => { setIsDirty(true); setEditedSettings(prev => ({ ...prev, defaultFuelPrice: parseFloat(e.target.value) || 0 })) }}
                  min="0"
                  step="0.01"
                  className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="defaultStopIntervalHours" className="block text-sm font-semibold text-blue-100/80">Intervalo de Paradas (Horas)</label>
              <input
                type="number"
                id="defaultStopIntervalHours"
                name="defaultStopIntervalHours"
                value={editedSettings.defaultStopIntervalHours ?? ''}
                onChange={(e) => { setIsDirty(true); setEditedSettings(prev => ({ ...prev, defaultStopIntervalHours: parseFloat(e.target.value) || 0 })) }}
                min="1"
                max="24"
                step="0.5"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label htmlFor="preferredStopBrands" className="block text-sm font-semibold text-blue-100/80">Marcas de Paradas Preferidas</label>
              <input
                type="text"
                id="preferredStopBrands"
                name="preferredStopBrands"
                value={editedSettings.preferredStopBrands ?? ''}
                onChange={(e) => { setIsDirty(true); setEditedSettings(prev => ({ ...prev, preferredStopBrands: e.target.value })) }}
                placeholder="Ej. Wawa, Racetrack, Circle K"
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 shadow-inner shadow-blue-500/10 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <button
              onClick={saveSettings}
              disabled={localLoading || isLoading}
              className="w-full rounded-xl border border-blue-400/50 bg-blue-500/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-blue-200/50"
            >
              {(localLoading || isLoading) ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        <div
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="140"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Factores de Recargo</h2>
            <p className="mt-1 text-sm text-blue-100/70">Personalice ajustes adicionales para reflejar temporadas, herramientas o servicios premium.</p>
          </div>

          <div className="space-y-4">
            {editedSettings.surchargeFactors && editedSettings.surchargeFactors.length > 0 ? (
              editedSettings.surchargeFactors.map((factor) => (
                <div
                  key={factor.id || Math.random().toString()}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-blue-500/10 md:flex-row md:items-center"
                >
                  <input
                    type="text"
                    value={factor.name ?? ''}
                    onChange={(e) => handleSurchargeChange(factor.id, 'name', e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Nombre"
                  />
                  <input
                    type="number"
                    value={factor.rate ?? ''}
                    onChange={(e) => handleSurchargeChange(factor.id, 'rate', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 md:w-28"
                    placeholder="Valor"
                  />
                  <select
                    value={factor.type ?? ''}
                    onChange={(e) => handleSurchargeChange(factor.id, 'type', e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 md:w-32"
                  >
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                  <button
                    onClick={() => handleRemoveSurchargeFactor(factor.id)}
                    disabled={localLoading || isLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20 hover:text-rose-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-rose-200/40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-blue-100/60">
                No hay factores de recargo configurados.
              </p>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-blue-500/10">
              <h3 className="text-sm font-semibold text-white">Añadir nuevo factor</h3>
              <p className="mt-1 text-xs text-blue-200/70">Combine nombre, valor y tipo para registrar ajustes personalizados.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <input
                  type="text"
                  name="name"
                  value={newSurchargeFactor.name}
                  onChange={handleNewSurchargeChange}
                  className="md:col-span-2 rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Nombre del factor"
                />
                <input
                  type="number"
                  name="rate"
                  value={newSurchargeFactor.rate}
                  onChange={handleNewSurchargeChange}
                  min="0"
                  step="0.01"
                  className="rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Valor"
                />
                <select
                  name="type"
                  value={newSurchargeFactor.type}
                  onChange={handleNewSurchargeChange}
                  className="rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
                <button
                  onClick={handleAddSurchargeFactor}
                  disabled={localLoading || isLoading}
                  className="md:col-span-4 rounded-xl border border-blue-400/50 bg-blue-500/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-blue-200/50"
                >
                  {(localLoading || isLoading) ? 'Añadiendo…' : 'Añadir factor'}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
          data-aos="fade-up"
          data-aos-delay="200"
        >
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white">Descuentos</h2>
            <p className="mt-1 text-sm text-blue-100/70">Gestione descuentos promocionales o acuerdos especiales.</p>
          </div>

          <div className="space-y-4">
            {editedSettings.discounts && editedSettings.discounts.length > 0 ? (
              editedSettings.discounts.map((discount) => (
                <div
                  key={discount.id || Math.random().toString()}
                  className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-blue-500/10 md:flex-row md:items-center"
                >
                  <input
                    type="text"
                    value={discount.name ?? ''}
                    onChange={(e) => handleDiscountChange(discount.id, 'name', e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="Nombre"
                  />
                  <input
                    type="number"
                    value={discount.rate ?? ''}
                    onChange={(e) => handleDiscountChange(discount.id, 'rate', e.target.value)}
                    min="0"
                    step="0.01"
                    className="w-full rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 md:w-28"
                    placeholder="Valor"
                  />
                  <select
                    value={discount.type ?? ''}
                    onChange={(e) => handleDiscountChange(discount.id, 'type', e.target.value)}
                    className="w-full rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 md:w-32"
                  >
                    <option value="percentage">Porcentaje</option>
                    <option value="fixed">Monto fijo</option>
                  </select>
                  <button
                    onClick={() => handleRemoveDiscount(discount.id)}
                    disabled={localLoading || isLoading}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/40 bg-rose-500/10 text-rose-200 transition hover:bg-rose-500/20 hover:text-rose-100 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-rose-200/40"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-blue-100/60">
                No hay descuentos configurados.
              </p>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-blue-500/10">
              <h3 className="text-sm font-semibold text-white">Añadir nuevo descuento</h3>
              <p className="mt-1 text-xs text-blue-200/70">Configure promociones en cuestión de segundos.</p>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
                <input
                  type="text"
                  name="name"
                  value={newDiscount.name}
                  onChange={handleNewDiscountChange}
                  className="md:col-span-2 rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Nombre del descuento"
                />
                <input
                  type="number"
                  name="rate"
                  value={newDiscount.rate}
                  onChange={handleNewDiscountChange}
                  min="0"
                  step="0.01"
                  className="rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-blue-200/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="Valor"
                />
                <select
                  name="type"
                  value={newDiscount.type}
                  onChange={handleNewDiscountChange}
                  className="rounded-xl border border-white/15 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
                <button
                  onClick={handleAddDiscount}
                  disabled={localLoading || isLoading}
                  className="md:col-span-4 rounded-xl border border-blue-400/50 bg-blue-500/20 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 whitespace-nowrap disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-blue-200/50"
                >
                  {(localLoading || isLoading) ? 'Añadiendo…' : 'Añadir descuento'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div
            className="rounded-3xl border border-white/10 bg-slate-900/50 p-6 shadow-2xl shadow-blue-500/10 backdrop-blur"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white">Uso de APIs</h2>
              <p className="mt-1 text-sm text-blue-100/70">Contadores reales de llamadas a servicios externos persistidos en base de datos.</p>
            </div>
            <ApiQuotasCompact />
          </div>
        )}

        {isAdmin && hasFeature('data_management') && (
          <DangerZone />
        )}
      </div>

    </div>
  )
}

function ApiQuotasCompact() {
  const { today, total, loading, error, refresh, resetService } = useApiUsageLogs()

  const rows = [
    {
      key: 'gm_autocomplete',
      label: 'Google Autocomplete',
      today: today['gm_autocomplete'] || 0,
      total: total['gm_autocomplete'] || 0,
      limit: 50,
    },
    {
      key: 'gm_directions',
      label: 'Google Directions',
      today: today['gm_directions'] || 0,
      total: total['gm_directions'] || 0,
      limit: 30,
    },
    {
      key: 'eia_fuel_price',
      label: 'EIA Precios de combustible',
      today: today['eia_fuel_price'] || 0,
      total: total['eia_fuel_price'] || 0,
      limit: 20,
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-blue-100/80 transition hover:bg-white/10 disabled:opacity-50"
          title="Actualizar contadores"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      {error && (
        <p className="mb-3 text-xs text-red-300">Error: {error}</p>
      )}

      <div className="space-y-4">
        {rows.map((row) => {
          const percent = row.limit > 0 ? Math.round((row.today / row.limit) * 100) : 0
          const isCritical = percent >= 90
          const isWarning = percent >= 70 && percent < 90
          const dotColor = isCritical ? 'bg-red-400' : isWarning ? 'bg-yellow-400' : 'bg-emerald-400'
          const barColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-yellow-400' : 'bg-emerald-500'

          return (
            <div key={row.key}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2 w-2 rounded-full ${dotColor}`} />
                  <span className="text-sm text-blue-100/90">{row.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-blue-200/50">
                    Hoy: <span className="font-medium text-white">{row.today}</span>
                  </span>
                  <span className="text-xs text-blue-200/30">|</span>
                  <span className="text-xs text-blue-200/50">
                    Total: <span className="font-medium text-white">{row.total}</span>
                  </span>
                </div>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-blue-200/50">
                <span>
                  {isCritical && 'Cuota crítica'}
                  {isWarning && 'Cuota alta'}
                  {!isCritical && !isWarning && 'Dentro del límite'}
                </span>
                <div className="flex items-center gap-2">
                  <span>{percent}% del límite diario</span>
                  <button
                    onClick={() => resetService(row.key)}
                    className="text-[10px] text-red-300/60 transition hover:text-red-300"
                    title="Eliminar todos los registros de este servicio"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ENTITY_CONFIG = [
  {
    key: 'invoices',
    label: 'Facturas',
    table: 'invoices',
    cascade: [],
    warning: 'Las facturas asociadas a órdenes serán eliminadas en cascada al borrar órdenes.',
  },
  {
    key: 'orders',
    label: 'Órdenes',
    table: 'orders',
    cascade: ['order_items', 'invoices'],
    warning: 'Eliminar órdenes también eliminará en cascada todos los order items y facturas asociadas.',
  },
  {
    key: 'trips',
    label: 'Viajes',
    table: 'trips',
    cascade: ['trip_surcharges', 'trip_discounts'],
    warning: 'Eliminar viajes también eliminará en cascada todos los recargos y descuentos aplicados.',
  },
  {
    key: 'surcharge_factors',
    label: 'Factores de recargo',
    table: 'surcharge_factors',
    cascade: [],
    warning: 'Los viajes conservan los montos ya aplicados, pero los factores ya no estarán disponibles para nuevos cálculos.',
  },
  {
    key: 'discounts',
    label: 'Descuentos',
    table: 'discounts',
    cascade: [],
    warning: 'Los viajes conservan los montos ya aplicados, pero los descuentos ya no estarán disponibles para nuevos cálculos.',
  },
]

function DangerZone() {
  const { notifyStateChange } = useAppContext()
  const toast = useToast()
  const [counts, setCounts] = useState({})
  const [countsLoading, setCountsLoading] = useState(true)
  const [selected, setSelected] = useState(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [factoryDialogOpen, setFactoryDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchCounts = async () => {
    setCountsLoading(true)
    try {
      const result = await backendService.getEntityCounts()
      setCounts(result)
    } catch {
      setCounts({})
    } finally {
      setCountsLoading(false)
    }
  }

  useEffect(() => {
    fetchCounts()
  }, [])

  const toggleEntity = (key) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const buildCascadeWarning = () => {
    const warnings = []
    for (const key of selected) {
      const config = ENTITY_CONFIG.find(e => e.key === key)
      if (config && config.cascade.length > 0) {
        warnings.push(`${config.label}: ${config.warning}`)
      }
    }
    return warnings.join('\n\n')
  }

  const buildSelectedMessage = () => {
    const items = []
    for (const key of selected) {
      const config = ENTITY_CONFIG.find(e => e.key === key)
      if (config) {
        const count = counts[config.table] ?? 0
        items.push(`• ${config.label}: ${count} registro(s)`)
      }
    }
    const cascade = buildCascadeWarning()
    return cascade
      ? `${items.join('\n')}\n\nAdvertencia de cascada:\n${cascade}`
      : items.join('\n')
  }

  const handleDeleteSelected = async () => {
    setDeleting(true)
    try {
      const order = ['invoices', 'orders', 'trips', 'surcharge_factors', 'discounts']
      for (const key of order) {
        if (!selected.has(key)) continue
        const methodMap = {
          invoices: 'deleteAllInvoices',
          orders: 'deleteAllOrders',
          trips: 'deleteAllTrips',
          surcharge_factors: 'deleteAllSurcharges',
          discounts: 'deleteAllDiscounts',
        }
        await backendService[methodMap[key]]()
      }
      toast.success('Datos eliminados correctamente')
      setSelected(new Set())
      setDialogOpen(false)
      await fetchCounts()
      notifyStateChange('trips')
      notifyStateChange('orders')
      notifyStateChange('invoices')
    } catch (err) {
      toast.error(err.message || 'Error al eliminar datos')
    } finally {
      setDeleting(false)
    }
  }

  const handleFactoryReset = async () => {
    setDeleting(true)
    try {
      await backendService.deleteAllBusinessData()
      toast.success('Reinicio de fábrica completado — todos los datos de negocio eliminados')
      setFactoryDialogOpen(false)
      await fetchCounts()
      notifyStateChange('trips')
      notifyStateChange('orders')
      notifyStateChange('invoices')
    } catch (err) {
      toast.error(err.message || 'Error al realizar el reinicio de fábrica')
    } finally {
      setDeleting(false)
    }
  }

  const selectedCount = selected.size
  const hasSelection = selectedCount > 0
  const cascadeWarning = buildCascadeWarning()

  return (
    <div
      className="rounded-3xl border border-rose-500/20 bg-slate-900/50 p-6 shadow-2xl shadow-rose-900/10 backdrop-blur"
      data-aos="fade-up"
      data-aos-delay="300"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-500/15">
          <svg className="h-5 w-5 text-rose-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-rose-100">Zona de peligro</h2>
          <p className="mt-0.5 text-sm text-blue-100/60">Elimine permanentemente datos de la base de datos. Estas acciones son irreversibles.</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-sm font-medium text-blue-100/80">Eliminar por tipo de entidad</p>
        <p className="mt-1 text-xs text-blue-100/50">Seleccione qué datos eliminar. Los conteos se actualizan al cargar la página.</p>

        <div className="mt-4 space-y-2">
          {ENTITY_CONFIG.map(entity => {
            const count = counts[entity.table] ?? 0
            const isSelected = selected.has(entity.key)
            return (
              <label
                key={entity.key}
                className={`flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 transition ${
                  isSelected
                    ? 'border-rose-400/50 bg-rose-500/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleEntity(entity.key)}
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-rose-500 focus:ring-rose-400/40"
                  />
                  <div>
                    <span className="text-sm font-medium text-blue-100/90">{entity.label}</span>
                    {entity.cascade.length > 0 && (
                      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-amber-300/70">
                        Cascada: {entity.cascade.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-sm font-semibold ${count > 0 ? 'text-rose-300/80' : 'text-blue-100/40'}`}>
                  {countsLoading ? '...' : `${count} registro(s)`}
                </span>
              </label>
            )
          })}
        </div>

        {cascadeWarning && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-4">
            <div className="flex items-start gap-3">
              <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <div className="text-xs text-amber-100/80 whitespace-pre-line">
                <p className="font-semibold text-amber-200">Advertencia de eliminación en cascada</p>
                <p className="mt-1">{cascadeWarning}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={!hasSelection}
            className="rounded-xl border border-rose-400/40 bg-rose-500/15 px-5 py-2.5 text-sm font-semibold text-rose-100 transition-all hover:scale-[1.02] hover:bg-rose-500/25 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-rose-200/30"
          >
            Eliminar seleccionados {hasSelection && `(${selectedCount})`}
          </button>
          <button
            type="button"
            onClick={() => setFactoryDialogOpen(true)}
            className="rounded-xl border border-rose-500/50 bg-rose-600/20 px-5 py-2.5 text-sm font-bold text-rose-50 transition-all hover:scale-[1.02] hover:bg-rose-600/30"
          >
            Reinicio de fábrica
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        title="Eliminar datos seleccionados"
        message={buildSelectedMessage()}
        confirmLabel="Eliminar permanentemente"
        cancelLabel="Cancelar"
        destructive
        typeToConfirm="ELIMINAR"
        loading={deleting}
        onConfirm={handleDeleteSelected}
        onCancel={() => setDialogOpen(false)}
      />

      <ConfirmDialog
        open={factoryDialogOpen}
        title="Reinicio de fábrica"
        message="Esta acción eliminará permanentemente TODOS los datos de negocio:\n\n• Todas las facturas\n• Todas las órdenes y order items\n• Todos los viajes, recargos y descuentos aplicados\n• Todos los factores de recargo\n• Todos los descuentos\n\nLas cuentas de usuario y la configuración de la empresa NO se verán afectadas."
        confirmLabel="Eliminar todo"
        cancelLabel="Cancelar"
        destructive
        typeToConfirm="RESET"
        loading={deleting}
        onConfirm={handleFactoryReset}
        onCancel={() => setFactoryDialogOpen(false)}
      />
    </div>
  )
}

export default Settings
