import React, { useState, useEffect } from 'react';
import OpenStreetPlaceSearch from './OpenStreetPlaceSearch';

const ManualDistanceInput = ({ onCalculate }) => {
  const [calculationType, setCalculationType] = useState('combined'); // 'combined', 'distance-only', 'duration-only'
  const [errors, setErrors] = useState({});
  
  // Separate state for each calculation type
  const [combinedState, setCombinedState] = useState({
    origin: null,
    destination: null,
    distance: '',
    duration: ''
  });
  
  const [distanceOnlyState, setDistanceOnlyState] = useState({
    origin: null,
    destination: null,
    distance: ''
  });
  
  const [durationOnlyState, setDurationOnlyState] = useState({
    origin: null,
    destination: null,
    duration: ''
  });
  
  // Get current state based on calculation type
  const getCurrentState = () => {
    switch (calculationType) {
      case 'combined': return combinedState;
      case 'distance-only': return distanceOnlyState;
      case 'duration-only': return durationOnlyState;
      default: return combinedState;
    }
  };
  
  const currentState = getCurrentState();
  const { origin, destination, distance, duration } = currentState;

  // Update state based on calculation type
  const updateCurrentState = (updates) => {
    switch (calculationType) {
      case 'combined':
        setCombinedState(prev => ({ ...prev, ...updates }));
        break;
      case 'distance-only':
        setDistanceOnlyState(prev => ({ ...prev, ...updates }));
        break;
      case 'duration-only':
        setDurationOnlyState(prev => ({ ...prev, ...updates }));
        break;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchRoute = async () => {
      // Only fetch route for combined mode and when both places are selected
      if (calculationType === 'combined' && origin && destination && origin.lat && origin.lng && destination.lat && destination.lng) {
        try {
          const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false&alternatives=true&steps=true&hints=;`
          );
          const data = await response.json();
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const distanceInMeters = route.distance;
            const durationInSeconds = route.duration;
            
            const distanceInMiles = distanceInMeters / 1609.34;
            const durationInHours = durationInSeconds / 3600;
            
            if (isMounted) {
              updateCurrentState({
                distance: distanceInMiles.toFixed(2),
                duration: durationInHours.toFixed(2)
              });
            }
          }
        } catch (error) {
          console.error('Error fetching route from OSM:', error);
        }
      }
    };

    fetchRoute();

    return () => {
      isMounted = false;
    };
  }, [origin, destination, calculationType]);

  const validate = (fieldsOnly = false) => {
    const newErrors = {};
    
    // Origin/destination only required for combined mode
    if (calculationType === 'combined') {
      if (!origin || !origin.lat || !origin.lng) newErrors.origin = 'El origen es obligatorio';
      if (!destination || !destination.lat || !destination.lng) newErrors.destination = 'El destino es obligatorio';
    }
    // For single-parameter modes, origin/destination are optional
    
    // Validation based on calculation type
    if (calculationType === 'combined') {
      if (!distance) newErrors.distance = 'La distancia es obligatoria';
      else if (isNaN(distance) || distance <= 0) newErrors.distance = 'Distancia inválida';
      if (!duration) newErrors.duration = 'La duración es obligatoria';
      else if (isNaN(duration) || duration <= 0) newErrors.duration = 'Duración inválida';
    } else if (calculationType === 'distance-only') {
      if (!distance) newErrors.distance = 'La distancia es obligatoria';
      else if (isNaN(distance) || distance <= 0) newErrors.distance = 'Distancia inválida';
    } else if (calculationType === 'duration-only') {
      if (!duration) newErrors.duration = 'La duración es obligatoria';
      else if (isNaN(duration) || duration <= 0) newErrors.duration = 'Duración inválida';
    }
    
    if (!fieldsOnly) setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Auto-trigger calculation when required fields are filled and valid
  React.useEffect(() => {
    let isValid = false;
    let calcData = {
      origin: origin || null,
      destination: destination || null,
      calculationType,
      distance: null,
      duration: null,
    };

    if (calculationType === 'combined') {
      // Combined mode requires origin, destination, distance, and duration
      isValid = origin && origin.lat && origin.lng && 
                destination && destination.lat && destination.lng &&
                distance && !isNaN(distance) && distance > 0 && 
                duration && !isNaN(duration) && duration > 0;
      if (isValid) {
        calcData.distance = parseFloat(distance);
        calcData.duration = parseFloat(duration);
      }
    } else if (calculationType === 'distance-only') {
      // Distance-only mode only requires distance (origin/destination optional)
      isValid = distance && !isNaN(distance) && distance > 0;
      if (isValid) {
        calcData.distance = parseFloat(distance);
      }
    } else if (calculationType === 'duration-only') {
      // Duration-only mode only requires duration (origin/destination optional)
      isValid = duration && !isNaN(duration) && duration > 0;
      if (isValid) {
        calcData.duration = parseFloat(duration);
      }
    }

    if (isValid) {
      onCalculate(calcData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin, destination, distance, duration, calculationType]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    
    const calcData = {
      origin: origin || null,
      destination: destination || null,
      calculationType,
      distance: calculationType === 'duration-only' ? null : (distance ? parseFloat(distance) : null),
      duration: calculationType === 'distance-only' ? null : (duration ? parseFloat(duration) : null),
    };
    
    console.log('Submitting calculation with:', calcData);
    
    onCalculate(calcData);
  };
  
  // Handle calculation type change
  const handleCalculationTypeChange = (newType) => {
    setCalculationType(newType);
    setErrors({}); // Clear errors when switching tabs
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Calculation Type Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            type="button"
            onClick={() => handleCalculationTypeChange('combined')}
            className={`${
              calculationType === 'combined'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Distancia + Tiempo
          </button>
          <button
            type="button"
            onClick={() => handleCalculationTypeChange('distance-only')}
            className={`${
              calculationType === 'distance-only'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Solo Distancia
          </button>
          <button
            type="button"
            onClick={() => handleCalculationTypeChange('duration-only')}
            className={`${
              calculationType === 'duration-only'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm`}
          >
            Solo Tiempo
          </button>
        </nav>
      </div>

      {/* Origin and Destination - Required for combined, optional for others */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Origen {calculationType !== 'combined' && <span className="text-gray-400">(opcional)</span>}
        </label>
        <OpenStreetPlaceSearch
          key={`origin-${calculationType}`}
          placeholder="Ingrese el lugar de origen"
          onPlaceSelected={(place) => updateCurrentState({ origin: place })}
          value={origin}
        />
        {errors.origin && <p className="mt-1 text-sm text-red-600">{errors.origin}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Destino {calculationType !== 'combined' && <span className="text-gray-400">(opcional)</span>}
        </label>
        <OpenStreetPlaceSearch
          key={`destination-${calculationType}`}
          placeholder="Ingrese el lugar de destino"
          onPlaceSelected={(place) => updateCurrentState({ destination: place })}
          value={destination}
        />
        {errors.destination && <p className="mt-1 text-sm text-red-600">{errors.destination}</p>}
      </div>

      {/* Conditional input fields based on calculation type */}
      {(calculationType === 'combined' || calculationType === 'distance-only') && (
        <div>
          <label htmlFor="distance" className="block text-sm font-medium text-gray-700 mb-1">
            Distancia (millas)
          </label>
          <input
            type="number"
            id="distance"
            value={distance || ''}
            onChange={(e) => updateCurrentState({ distance: e.target.value })}
            className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${errors.distance ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ingrese la distancia en millas"
            min="0"
            step="any"
          />
          {errors.distance && <p className="mt-1 text-sm text-red-600">{errors.distance}</p>}
        </div>
      )}

      {(calculationType === 'combined' || calculationType === 'duration-only') && (
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
            Duración (horas)
          </label>
          <input
            type="number"
            id="duration"
            value={duration || ''}
            onChange={(e) => updateCurrentState({ duration: e.target.value })}
            className={`w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500 ${errors.duration ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Ingrese la duración en horas"
            min="0"
            step="any"
          />
          {errors.duration && <p className="mt-1 text-sm text-red-600">{errors.duration}</p>}
        </div>
      )}

      {/* Info message based on calculation type */}
      <div className="p-3 bg-blue-50 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1 md:flex md:justify-between">
            <p className="text-sm text-blue-700">
              {calculationType === 'combined' && 'Precio basado en distancia Y tiempo de viaje'}
              {calculationType === 'distance-only' && 'Precio basado SOLO en la distancia del viaje'}
              {calculationType === 'duration-only' && 'Precio basado SOLO en el tiempo del viaje'}
            </p>
          </div>
        </div>
      </div>
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