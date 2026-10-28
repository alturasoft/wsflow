// Configuración centralizada de API para entornos local y producción
export const API_BASE = 
  import.meta.env.VITE_API_BASE || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' 
    ? 'http://localhost:3000/api' 
    : '/api');
