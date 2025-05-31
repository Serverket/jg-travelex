import { useState } from 'react'

const ManualDistanceInput = ({ onCalculate }) => {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')
  const [errors, setErrors] = useState({})

  const validate = () => {
    const newErrors = {}
    
    if (!origin.trim()) {
      newErrors.origin = 'El origen es obligatorio'
    }
    
    if (!destination.trim()) {
      newErrors.destination = 'El destino es obligatorio'
    }
    
    if (!distance) {
      newErrors.distance = 'La distancia es obligatoria'
    } else if (isNaN(distance) || parseFloat(distance) <= 0) {
      newErrors.distance = 'Ingrese una distancia válida mayor a 0'
    }
    
    if (!duration) {
      newErrors.duration = 'La duración es obligatoria'
    } else if (isNaN(duration) || parseFloat(duration) <= 0) {
      newErrors.duration = 'Ingrese una duración válida mayor a 0'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (validate()) {
      // Convertir duración de horas a minutos para mantener consistencia con otros métodos
      const durationInMinutes = parseFloat(duration) * 60
      
      onCalculate({
        origin: { description: origin },
        destination: { description: destination },
        distance: parseFloat(distance),
        duration: durationInMinutes
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="origin" className="block text-sm font-medium text-gray-700 mb-1">
          Origen
        </label>
        <input
          type="text"
          id="origin"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${errors.origin ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Ingrese el lugar de origen"
        />
        {errors.origin && <p className="mt-1 text-sm text-red-600">{errors.origin}</p>}
      </div>

      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
          Destino
        </label>
        <input
          type="text"
          id="destination"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${errors.destination ? 'border-red-500' : 'border-gray-300'}`}
          placeholder="Ingrese el lugar de destino"
        />
        {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="distance" className="block text-sm font-medium text-gray-700 mb-1">
            Distancia (millas)
          </label>
          <input
            type="number"
            id="distance"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            step="0.1"
            min="0.1"
            className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${errors.distance ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ingrese la distancia"
          />
          {errors.distance && <p className="mt-1 text-sm text-red-600">{errors.distance}</p>}
        </div>

        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Duración (horas)
          </label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            step="0.1"
            min="0.1"
            className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${errors.duration ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ingrese la duración"
          />
          {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-150 ease-in-out"
        >
          Calcular
        </button>
      </div>
    </form>
  )
}

export default ManualDistanceInput