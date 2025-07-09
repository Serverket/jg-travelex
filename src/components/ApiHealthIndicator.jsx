import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';

const ApiHealthIndicator = () => {
  const [apiStatus, setApiStatus] = useState('checking');
  
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        // Attempt to connect to the API
        await apiService.get('/health');
        setApiStatus('connected');
      } catch (error) {
        console.error('API health check failed:', error);
        setApiStatus('disconnected');
      }
    };
    
    // Check immediately on component mount
    checkApiHealth();
    
    // Set up interval to check API health every 30 seconds
    const intervalId = setInterval(checkApiHealth, 30000);
    
    // Clean up interval on component unmount
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
