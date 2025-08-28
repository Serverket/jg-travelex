import React, { useState, useEffect } from 'react';
import { supabaseService } from '../services/supabase';
import { backendService } from '../services/backendService';

const ApiHealthIndicator = () => {
  const [supabaseStatus, setSupabaseStatus] = useState('checking');
  const [backendStatus, setBackendStatus] = useState('checking');

  const checkHealth = async () => {
    // Check Supabase
    try {
      const res = await supabaseService.checkHealth();
      setSupabaseStatus(res?.healthy ? 'connected' : 'disconnected');
    } catch {
      setSupabaseStatus('disconnected');
    }

    // Check Backend
    try {
      const res = await backendService.health();
      setBackendStatus(res?.ok ? 'connected' : 'disconnected');
    } catch {
      setBackendStatus('disconnected');
    }
  };

  useEffect(() => {
    checkHealth();
    const intervalId = setInterval(checkHealth, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const pill = (label, status) => (
    <div className={`flex items-center rounded-full px-3 py-1 text-sm ${
      status === 'connected' ? 'bg-green-100 text-green-800' :
      status === 'disconnected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
    }`}>
      <div className={`w-2 h-2 rounded-full mr-2 ${
        status === 'connected' ? 'bg-green-500' :
        status === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
      }`}></div>
      {label}: {status === 'connected' ? 'Connected' : status === 'disconnected' ? 'Disconnected' : 'Checking...'}
    </div>
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {pill('Backend', backendStatus)}
      {pill('Supabase', supabaseStatus)}
    </div>
  );
};

export default ApiHealthIndicator;
