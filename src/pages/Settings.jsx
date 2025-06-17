import { useState, useEffect } from 'react'
import { useAppContext } from '../context/AppContext'

const Settings = () => {
  const { rateSettings, updateRateSettings, addSurchargeFactor, addDiscount } = useAppContext()
  
  // Estado local para editar configuraciones
  const [editedSettings, setEditedSettings] = useState({
    ...rateSettings
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

  // Reset editedSettings when rateSettings change
  useEffect(() => {
    setEditedSettings({ ...rateSettings });
  }, [rateSettings]);

  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

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
      [name]: name === 'rate' ? value : value
    }))
  }

  // Manejar cambios en el nuevo descuento
  const handleNewDiscountChange = (e) => {
    const { name, value } = e.target
    setNewDiscount(prev => ({
      ...prev,
      [name]: name === 'rate' ? value : value
    }))
  }

  // Guardar cambios en las configuraciones
  const saveSettings = () => {
    try {
      updateRateSettings(editedSettings)
      setSuccessMessage('Configuraciones guardadas correctamente')
      setErrorMessage('')
      
      // Limpiar mensaje después de 3 segundos
      setTimeout(() => {
        setSuccessMessage('')
      }, 3000)
    } catch (error) {
      setErrorMessage('Error al guardar las configuraciones')
      setSuccessMessage('')
    }
  }

  // Añadir nuevo factor de recargo
  const handleAddSurchargeFactor = () => {
    if (!newSurchargeFactor.name || !newSurchargeFactor.rate) {
      setErrorMessage('Por favor complete todos los campos del factor de recargo')
      return
    }
    
    try {
      addSurchargeFactor({
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
      setErrorMessage('Error al añadir el factor de recargo')
      setSuccessMessage('')
    }
  }

  // Añadir nuevo descuento
  const handleAddDiscount = () => {
    if (!newDiscount.name || !newDiscount.rate) {
      setErrorMessage('Por favor complete todos los campos del descuento')
      return
    }
    
    try {
      addDiscount({
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
      setErrorMessage('Error al añadir el descuento')
      setSuccessMessage('')
    }
  }

  // Eliminar un factor de recargo
  const handleRemoveSurchargeFactor = (id) => {
    setEditedSettings(prev => ({
      ...prev,
      surchargeFactors: prev.surchargeFactors.filter(factor => factor.id !== id)
    }))
  }

  // Eliminar un descuento
  const handleRemoveDiscount = (id) => {
    setEditedSettings(prev => ({
      ...prev,
      discounts: prev.discounts.filter(discount => discount.id !== id)
    }))
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
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Guardar Cambios
            </button>
          </div>
        </div>
        
        {/* Factores de Recargo */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Factores de Recargo</h2>
          
          <div className="space-y-4">
            {editedSettings.surchargeFactors.map((factor) => (
              <div key={factor.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md">
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
                  className="p-2 text-red-600 hover:text-red-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Añadir Nuevo Factor</h3>
              
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  name="name"
                  value={newSurchargeFactor.name}
                  onChange={handleNewSurchargeChange}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto Fijo</option>
                </select>
              </div>
              
              <button
                onClick={handleAddSurchargeFactor}
                className="mt-2 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Añadir Factor
              </button>
            </div>
          </div>
        </div>
        
        {/* Descuentos */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Descuentos</h2>
          
          <div className="space-y-4">
            {editedSettings.discounts.map((discount) => (
              <div key={discount.id} className="flex items-center space-x-2 p-2 border border-gray-200 rounded-md">
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
                  className="p-2 text-red-600 hover:text-red-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
            
            <div className="mt-4 p-4 bg-gray-50 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Añadir Nuevo Descuento</h3>
              
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  name="name"
                  value={newDiscount.name}
                  onChange={handleNewDiscountChange}
                  className="col-span-3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  className="col-span-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto Fijo</option>
                </select>
              </div>
              
              <button
                onClick={handleAddDiscount}
                className="mt-2 w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Añadir Descuento
              </button>
            </div>
          </div>
        </div>
        
        {/* Configuración de API */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Configuración de API</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="googleMapsApiKey" className="block text-sm font-medium text-gray-700">Clave de API de Google Maps</label>
              <input
                type="text"
                id="googleMapsApiKey"
                value={import.meta.env.VITE_APP_GOOGLE_MAPS_API_KEY || ''}
                disabled
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">Para cambiar la clave de API, edite el archivo .env en la raíz del proyecto.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings