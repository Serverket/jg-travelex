import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

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
    error: contextError 
  } = useAppContext()
  
  // Estado local para editar configuraciones con valores por defecto seguros
  const [editedSettings, setEditedSettings] = useState({
    distanceRate: 1.5,
    durationRate: 15,
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
        durationRate: parseFloat(editedSettings.durationRate) || 0
      }).catch(err => {
        console.error('Error updating rate settings:', err)
        throw new Error('Error al actualizar tarifas base')
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
      
      {/* Mensajes de éxito o error */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {successMessage}
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {errorMessage}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarifas Base */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Tarifas Base</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="distanceRate" className="block text-sm font-medium text-gray-700">Tarifa por Milla ($)</label>
              <input
                type="number"
                id="distanceRate"
                name="distanceRate"
                value={editedSettings.distanceRate ?? ''}
                onChange={handleBaseRateChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="durationRate" className="block text-sm font-medium text-gray-700">Tarifa por Hora ($)</label>
              <input
                type="number"
                id="durationRate"
                name="durationRate"
                value={editedSettings.durationRate ?? ''}
                onChange={handleBaseRateChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            
            <button
              onClick={saveSettings}
              disabled={localLoading || isLoading}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {(localLoading || isLoading) ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
        
        {/* Factores de Recargo */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Factores de Recargo</h2>
          
          <div className="space-y-4">
            {editedSettings.surchargeFactors && editedSettings.surchargeFactors.length > 0 ? (
              editedSettings.surchargeFactors.map((factor) => (
                <div key={factor.id || Math.random().toString()} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={factor.name ?? ''}
                      onChange={(e) => handleSurchargeChange(factor.id, 'name', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Nombre"
                    />
                  </div>
                  
                  <div className="w-24">
                    <input
                      type="number"
                      value={factor.rate ?? ''}
                      onChange={(e) => handleSurchargeChange(factor.id, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Valor"
                    />
                  </div>
                  
                  <div className="w-32">
                    <select
                      value={factor.type ?? ''}
                      onChange={(e) => handleSurchargeChange(factor.id, 'type', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="percentage">Porcentaje</option>
                      <option value="fixed">Monto Fijo</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveSurchargeFactor(factor.id)}
                    disabled={localLoading || isLoading}
                    className="p-2 text-red-600 hover:text-red-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No hay factores de recargo configurados.</p>
            )}
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Añadir Nuevo Factor</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  name="name"
                  value={newSurchargeFactor.name}
                  onChange={handleNewSurchargeChange}
                  className="col-span-1 md:col-span-3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Nombre del factor"
                />
                
                <input
                  type="number"
                  name="rate"
                  value={newSurchargeFactor.rate}
                  onChange={handleNewSurchargeChange}
                  min="0"
                  step="0.01"
                  className="col-span-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Valor"
                />
                
                <select
                  name="type"
                  value={newSurchargeFactor.type}
                  onChange={handleNewSurchargeChange}
                  className="col-span-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto Fijo</option>
                </select>
                
                <button
                  onClick={handleAddSurchargeFactor}
                  disabled={localLoading || isLoading}
                  className="col-span-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {(localLoading || isLoading) ? 'Añadiendo...' : 'Añadir'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Descuentos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Descuentos</h2>
          
          <div className="space-y-4">
            {editedSettings.discounts && editedSettings.discounts.length > 0 ? (
              editedSettings.discounts.map((discount) => (
                <div key={discount.id || Math.random().toString()} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md">
                  <div className="flex-grow">
                    <input
                      type="text"
                      value={discount.name ?? ''}
                      onChange={(e) => handleDiscountChange(discount.id, 'name', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Nombre"
                    />
                  </div>
                  
                  <div className="w-24">
                    <input
                      type="number"
                      value={discount.rate ?? ''}
                      onChange={(e) => handleDiscountChange(discount.id, 'rate', e.target.value)}
                      min="0"
                      step="0.01"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Valor"
                    />
                  </div>
                  
                  <div className="w-32">
                    <select
                      value={discount.type ?? ''}
                      onChange={(e) => handleDiscountChange(discount.id, 'type', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="percentage">Porcentaje</option>
                      <option value="fixed">Monto Fijo</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={() => handleRemoveDiscount(discount.id)}
                    disabled={localLoading || isLoading}
                    className="p-2 text-red-600 hover:text-red-900"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No hay descuentos configurados.</p>
            )}
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Añadir Nuevo Descuento</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  name="name"
                  value={newDiscount.name}
                  onChange={handleNewDiscountChange}
                  className="col-span-1 md:col-span-3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Nombre del descuento"
                />
                
                <input
                  type="number"
                  name="rate"
                  value={newDiscount.rate}
                  onChange={handleNewDiscountChange}
                  min="0"
                  step="0.01"
                  className="col-span-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Valor"
                />
                
                <select
                  name="type"
                  value={newDiscount.type}
                  onChange={handleNewDiscountChange}
                  className="col-span-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto Fijo</option>
                </select>
                
                <button
                  onClick={handleAddDiscount}
                  disabled={localLoading || isLoading}
                  className="col-span-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {(localLoading || isLoading) ? 'Añadiendo...' : 'Añadir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
