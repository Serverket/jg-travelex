import React, { useState } from 'react';
import OpenStreetPlaceSearch from './OpenStreetPlaceSearch';
import OpenStreetMap from './OpenStreetMap';

const ManualDistanceInput = ({ onCalculate }) => {
  const [origin, setOrigin] = useState(null); // { description, lat, lng, ... }
  const [destination, setDestination] = useState(null);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [inputMode, setInputMode] = useState('distance');
  const [errors, setErrors] = useState({});
  
  // Reset non-active input when switching modes
  const handleModeChange = (mode) => {
    setInputMode(mode);
    if (mode === 'distance') {
      setDuration('');
    } else {
      setDistance('');
    }
    setErrors({});
  };

  const validate = (fieldsOnly = false) => {
    const newErrors = {};
    if (!origin || !origin.lat || !origin.lng) newErrors.origin = 'El origen es obligatorio';
    if (!destination || !destination.lat || !destination.lng) newErrors.destination = 'El destino es obligatorio';
    
    if (inputMode === 'distance') {
      if (!distance) newErrors.distance = 'La distancia es obligatoria';
      else if (isNaN(distance) || distance <= 0) newErrors.distance = 'Distancia inválida';
    } else {
      if (!duration) newErrors.duration = 'La duración es obligatoria';
      else if (isNaN(duration) || duration <= 0) newErrors.duration = 'Duración inválida';
    }
    if (!fieldsOnly) setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Auto-trigger calculation when all required fields are filled and valid
  React.useEffect(() => {
    // Always trigger when both places are selected, even if distance/duration is empty
    if (
      origin && origin.lat && origin.lng &&
      destination && destination.lat && destination.lng
    ) {
      const calcData = {
        origin,
        destination,
        distance: inputMode === 'distance' && distance && !isNaN(distance) && distance > 0 ? parseFloat(distance) : null,
        duration: inputMode === 'duration' && duration && !isNaN(duration) && duration > 0 ? parseFloat(duration) : null,
      };
      onCalculate(calcData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, distance, duration, inputMode]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    const calcData = {
      origin: origin,
      destination: destination,
      distance: inputMode === 'distance' ? parseFloat(distance) : null,
      duration: inputMode === 'duration' ? parseFloat(duration) : null,
    };
    
    console.log('Submitting calculation with:', calcData);
    
    onCalculate(calcData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Origen
        </label>
        <OpenStreetPlaceSearch
          placeholder="Ingrese el lugar de origen"
          onPlaceSelected={setOrigin}
        />
        {errors.origin && <p className="mt-1 text-sm text-red-600">{errors.origin}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destino
        </label>
        <OpenStreetPlaceSearch
          placeholder="Ingrese el lugar de destino"
          onPlaceSelected={setDestination}
        />
        {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination}</p>}
      </div>

      <div className="flex space-x-4">
        <label className="block text-sm font-medium text-gray-700">Tipo de entrada:</label>
        <div className="flex items-center">
          <input
            type="radio"
            id="distanceMode"
            value="distance"
            checked={inputMode === 'distance'}
            onChange={() => handleModeChange('distance')}
            className="form-radio"
          />
          <label htmlFor="distanceMode" className="ml-2">
            Distancia
          </label>
        </div>
        <div className="flex items-center">
          <input
            type="radio"
            id="durationMode"
            value="duration"
            checked={inputMode === 'duration'}
            onChange={() => handleModeChange('duration')}
            className="form-radio"
          />
          <label htmlFor="durationMode" className="ml-2">
            Duración
          </label>
        </div>
      </div>

      {inputMode === 'distance' ? (
        <div>
          <label htmlFor="distance" className="block text-sm font-medium text-gray-700 mb-1">
            Distancia (millas)
          </label>
          <input
            type="number"
            id="distance"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${errors.distance ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ingrese la distancia en millas"
            min="0"
            step="any"
          />
          {errors.distance && <p className="mt-1 text-sm text-red-600">{errors.distance}</p>}
        </div>
      ) : (
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Duración (horas)
          </label>
          <input
            type="number"
            id="duration"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${errors.duration ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ingrese la duración en horas"
            min="0"
            step="any"
          />
          {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
        </div>
      )}
      {/* <button
        type="submit"
        className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Calcular
      </button> */}
    </form>
  );
};

export default ManualDistanceInput;