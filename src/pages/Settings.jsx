import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'
import { useApiUsageLogs } from '../hooks/useApiUsageLogs'

const Settings = () => {
  const { 
    rateSettings, 
    updateRateSettings, 
    addSurchargeFactor, 
    updateSurchargeFactor, 
    addDiscount, 
    updateDiscount, 
    deleteSurchargeFactor, 
    deleteDiscount, 
    isLoading, 
    error: contextError,
    currentUser
  } = useAppContext()
  const isAdmin = currentUser?.role === 'admin'
  
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
  
  // Reset editedSettings when rateSettings change
  useEffect(() => {
    if (rateSettings) {
      setEditedSettings({ 
        distanceRate: rateSettings.distanceRate || 1.5,
        durationRate: rateSettings.durationRate || 15,
        defaultMpg: rateSettings.defaultMpg || 35,
        defaultFuelPrice: rateSettings.defaultFuelPrice || 4.00,
        defaultStopIntervalHours: rateSettings.defaultStopIntervalHours || 4.00,
        preferredStopBrands: rateSettings.preferredStopBrands || 'Wawa, Racetrack, Circle K',
        surchargeFactors: rateSettings.surchargeFactors || [],
        discounts: rateSettings.discounts || [] 
      })
    }
  }, [rateSettings])

  // Efecto para mostrar errores del contexto
  useEffect(() => {
    if (contextError) {
      setErrorMessage(contextError)
    }
  }, [contextError])

  // Manejar cambios en las tarifas base
  const handleBaseRateChange = (e) => {
    const { name, value } = e.target
    setEditedSettings(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }))
  }

  // Manejar cambios en los factores de recargo existentes
  const handleSurchargeChange = (id, field, value) => {
    setEditedSettings(prev => ({
      ...prev,
      surchargeFactors: prev.surchargeFactors.map(factor => 
        factor.id === id ? { ...factor, [field]: field === 'rate' ? parseFloat(value) || 0 : value } : factor
      )
    }))
  }

  // Manejar cambios en los descuentos existentes
  const handleDiscountChange = (id, field, value) => {
    setEditedSettings(prev => ({
      ...prev,
      discounts: prev.discounts.map(discount => 
        discount.id === id ? { ...discount, [field]: field === 'rate' ? parseFloat(value) || 0 : value } : discount
      )
    }))
  }

  // Manejar cambios en el nuevo factor de recargo
  const handleNewSurchargeChange = (e) => {
    const { name, value } = e.target
    setNewSurchargeFactor(prev => ({
      ...prev,
      [name]: name === 'rate' ? parseFloat(value) || 0 : value
    }))
  }

  // Manejar cambios en el nuevo descuento
  const handleNewDiscountChange = (e) => {
    const { name, value } = e.target
    setNewDiscount(prev => ({
      ...prev,
      [name]: name === 'rate' ? parseFloat(value) || 0 : value
    }))
  }

  // Guardar cambios en las configuraciones
  const saveSettings = async () => {
    try {
      setLocalLoading(true)
      setErrorMessage('')
      
      // Guardar cambios de tarifas base
      await updateRateSettings({
        distanceRate: parseFloat(editedSettings.distanceRate) || 0,
        durationRate: parseFloat(editedSettings.durationRate) || 0,
        defaultMpg: parseFloat(editedSettings.defaultMpg) || 0,
        defaultFuelPrice: parseFloat(editedSettings.defaultFuelPrice) || 0,
        defaultStopIntervalHours: parseFloat(editedSettings.defaultStopIntervalHours) || 0,
        preferredStopBrands: String(editedSettings.preferredStopBrands || '')
      }).catch(err => {
        console.error('Error updating rate settings:', err)
        throw new Error('Error al actualizar tarifas base y por defecto')
      })
      
      // Guardar cambios de factores de recargo
      const surchargePromises = []
      if (editedSettings.surchargeFactors && editedSettings.surchargeFactors.length > 0) {
        for (const factor of editedSettings.surchargeFactors) {
          if (factor && factor.id) {
            try {
              const surchargePromise = updateSurchargeFactor(factor.id, {
                name: factor.name || '',
                rate: parseFloat(factor.rate) || 0,
                type: factor.type || 'percentage'
              }).catch(err => {
                console.error(`Error updating surcharge factor ${factor.id}:`, err)
                throw new Error(`Error al actualizar el factor de recargo: ${factor.name}`)
              })
              surchargePromises.push(surchargePromise)
            } catch (err) {
              console.error(`Error preparing surcharge factor update for ${factor.id}:`, err)
              // Continue with other factors even if one fails
            }
          }
        }
      }
      
      // Guardar cambios de descuentos
      const discountPromises = []
      if (editedSettings.discounts && editedSettings.discounts.length > 0) {
        for (const discount of editedSettings.discounts) {
          if (discount && discount.id) {
            try {
              const discountPromise = updateDiscount(discount.id, {
                name: discount.name || '',
                rate: parseFloat(discount.rate) || 0,
                type: discount.type || 'percentage'
              }).catch(err => {
                console.error(`Error updating discount ${discount.id}:`, err)
                throw new Error(`Error al actualizar el descuento: ${discount.name}`)
              })
              discountPromises.push(discountPromise)
            } catch (err) {
              console.error(`Error preparing discount update for ${discount.id}:`, err)
              // Continue with other discounts even if one fails
            }
          }
        }
      }
      
      // Esperar a que todas las actualizaciones terminen y manejar errores
      try {
        const results = await Promise.allSettled([...surchargePromises, ...discountPromises])
        
        // Check if any promises failed
        const failures = results.filter(r => r.status === 'rejected').map(r => r.reason)
        if (failures.length > 0) {
          console.error('Some settings updates failed:', failures)
          throw new Error(`${failures.length} actualizaciones fallaron. Revise los datos e intente nuevamente.`)
        }
        
        setSuccessMessage('Configuraciones guardadas correctamente')
        setErrorMessage('')
      } catch (promiseErr) {
        console.error('Error in batch settings update:', promiseErr)
        throw new Error('Error al procesar las actualizaciones: ' + (promiseErr.message || 'Error desconocido'))
      }
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      console.error('Error al guardar configuraciones:', error)
      setErrorMessage('Error al guardar las configuraciones: ' + (error.message || 'Error desconocido'))
      setSuccessMessage('')
    } finally {
      setLocalLoading(false)
    }
  }

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
      
      // Actualizar estado local también
      setEditedSettings(prev => ({
        ...prev,
        surchargeFactors: prev.surchargeFactors.filter(factor => factor.id !== id)
      }))
      
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
      
      // Actualizar estado local también
      setEditedSettings(prev => ({
        ...prev,
        discounts: prev.discounts.filter(discount => discount.id !== id)
      }))
      
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
                  onChange={(e) => setEditedSettings(prev => ({ ...prev, defaultMpg: parseFloat(e.target.value) || 0 }))}
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
                  onChange={(e) => setEditedSettings(prev => ({ ...prev, defaultFuelPrice: parseFloat(e.target.value) || 0 }))}
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
                onChange={(e) => setEditedSettings(prev => ({ ...prev, defaultStopIntervalHours: parseFloat(e.target.value) || 0 }))}
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
                onChange={(e) => setEditedSettings(prev => ({ ...prev, preferredStopBrands: e.target.value }))}
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

export default Settings
