import React, { useState, useEffect, useMemo } from 'react';
import { supabaseService } from '../services/supabase';
import { backendService } from '../services/backendService';

const ApiHealthIndicator = () => {
  const [supabaseStatus, setSupabaseStatus] = useState('checking');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [hoveredPill, setHoveredPill] = useState(null);

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

  const statusStyles = useMemo(() => ({
    connected: {
      container: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100',
      dot: 'bg-emerald-400',
      icon: 'text-emerald-100'
    },
    disconnected: {
      container: 'bg-rose-500/15 border-rose-400/40 text-rose-100',
      dot: 'bg-rose-400',
      icon: 'text-rose-200'
    },
    checking: {
      container: 'bg-amber-500/15 border-amber-400/40 text-amber-100',
      dot: 'bg-amber-400',
      icon: 'text-amber-200'
    }
  }), []);

  const statusIcon = (status) => {
    const styles = statusStyles[status] || statusStyles.checking;

    if (status === 'connected') {
      return (
        <svg
          className={`h-4 w-4 ${styles.icon}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      );
    }

    if (status === 'disconnected') {
      return (
        <svg
          className={`h-4 w-4 ${styles.icon}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    }

    return (
      <svg
        className={`h-4 w-4 animate-spin ${styles.icon}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" className="opacity-25" />
        <path d="M4 12a8 8 0 018-8" />
      </svg>
    );
  };

  const statusText = (status) => {
    if (status === 'connected') return 'Conectado';
    if (status === 'disconnected') return 'Desconectado';
    return 'Verificando';
  };

  const serviceEmoji = {
    backend: '🤖',
    supabase: '🛢'
  };

  const pill = (label, status, pillType) => {
    const variant = statusStyles[status] || statusStyles.checking;
    const emoji = serviceEmoji[pillType] || '⚙️';

    return (
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-opacity duration-200 ${variant.container} ${hoveredPill === pillType ? 'opacity-100' : 'opacity-70'}`}
        onMouseEnter={() => setHoveredPill(pillType)}
        onMouseLeave={() => setHoveredPill(null)}
      >
        <span className={`h-2 w-2 rounded-full ${variant.dot}`} />
        <span aria-hidden="true" className="text-base">{emoji}</span>
        <span className="sr-only">{label}: {statusText(status)}</span>
        {statusIcon(status)}
      </div>
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {pill('Backend', backendStatus, 'backend')}
      {pill('Supabase', supabaseStatus, 'supabase')}
    </div>
  );
};

export default ApiHealthIndicator;
