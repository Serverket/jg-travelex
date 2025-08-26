import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabaseService';

const ApiHealthIndicator = () => {
  const [apiStatus, setApiStatus] = useState('checking');

  const checkApiHealth = async () => {
    try {
      await supabaseService.checkHealth();
      setApiStatus('connected');
    } catch (error) {
      setApiStatus('disconnected');
    }
  };

  useEffect(() => {
    checkApiHealth();
    const intervalId = setInterval(checkApiHealth, 30000);
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`flex items-center rounded-full px-3 py-1 text-sm ${
        apiStatus === 'connected' 
          ? 'bg-green-100 text-green-800' 
          : apiStatus === 'disconnected' 
            ? 'bg-red-100 text-red-800' 
            : 'bg-yellow-100 text-yellow-800'
      }`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${
          apiStatus === 'connected' 
            ? 'bg-green-500' 
            : apiStatus === 'disconnected' 
              ? 'bg-red-500' 
              : 'bg-yellow-500'
        }`}></div>
        API: {
          apiStatus === 'connected' 
            ? 'Connected' 
            : apiStatus === 'disconnected' 
              ? 'Disconnected' 
              : 'Checking...'
        }
      </div>
    </div>
  );
};

export default ApiHealthIndicator;
