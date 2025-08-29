import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

console.log('🔍 DEBUG - VITE_API_URL:', import.meta.env.VITE_API_URL);
console.log('🔍 DEBUG - API_BASE_URL:', API_BASE_URL);
console.log('🔍 DEBUG - Environment:', import.meta.env.MODE);

// Crear instancia de axios
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 segundos timeout
});

// Cache optimizado con diferentes TTL para diferentes tipos de datos
const cache = new Map();
const CACHE_DURATIONS = {
  static: 15 * 60 * 1000,    // 15 minutos para datos estáticos
  dynamic: 2 * 60 * 1000,    // 2 minutos para datos dinámicos
  realtime: 30 * 1000        // 30 segundos para datos en tiempo real
};

// Función para determinar el tipo de cache según la URL
const getCacheType = (url) => {
  if (url.includes('/queue') || url.includes('/stats')) return 'realtime';
  if (url.includes('/tickets') || url.includes('/impresion')) return 'dynamic';
  return 'static';
};

// Interceptor optimizado para agregar token de autenticación y cache inteligente
api.interceptors.request.use(
  (config) => {
    console.log('🚀 API REQUEST:', {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: config.baseURL + config.url
    });

    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Cache inteligente para requests GET
    if (config.method === 'get') {
      const cacheKey = `${config.url}_${JSON.stringify(config.params)}_${token?.slice(-10) || 'anon'}`;
      const cached = cache.get(cacheKey);
      const cacheType = getCacheType(config.url);
      const cacheDuration = CACHE_DURATIONS[cacheType];
      
      if (cached && Date.now() - cached.timestamp < cacheDuration) {
        console.log(`📦 Cache hit for ${config.url}`);
        config.adapter = () => Promise.resolve({
          ...cached.data,
          headers: { ...cached.data.headers, 'x-cache': 'HIT' }
        });
      }
    }

    return config;
  },
  (error) => {
    console.error('❌ API REQUEST ERROR:', error);
    return Promise.reject(error);
  }
);

// Interceptor optimizado para manejar respuestas y cache
api.interceptors.response.use(
  (response) => {
    console.log('✅ API RESPONSE:', {
      status: response.status,
      url: response.config.url,
      method: response.config.method?.toUpperCase(),
      data: response.data ? 'Data received' : 'No data'
    });

    // Guardar en cache respuestas GET exitosas con TTL apropiado
    if (response.config.method === 'get' && response.status === 200 && !response.headers['x-cache']) {
      const token = localStorage.getItem('token');
      const cacheKey = `${response.config.url}_${JSON.stringify(response.config.params)}_${token?.slice(-10) || 'anon'}`;
      
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      console.log(`📦 Cache set for ${response.config.url}`);
    }

    return response;
  },
  (error) => {
    console.error('❌ API RESPONSE ERROR:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      message: error.message,
      fullURL: error.config?.baseURL + error.config?.url
    });

    if (error.response?.status === 401) {
      // Limpiar cache y datos de usuario
      cache.clear();
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Función para invalidar cache específico
const invalidateCache = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

// Función para limpiar cache expirado de forma más eficiente
const cleanExpiredCache = () => {
  const now = Date.now();
  const keysToDelete = [];
  
  for (const [key, value] of cache.entries()) {
    const cacheType = getCacheType(key);
    const maxAge = CACHE_DURATIONS[cacheType];
    
    if (now - value.timestamp > maxAge) {
      keysToDelete.push(key);
    }
  }
  
  keysToDelete.forEach(key => cache.delete(key));
  
  if (keysToDelete.length > 0) {
    console.log(`Cleaned ${keysToDelete.length} expired cache entries`);
  }
};

// Limpiar cache expirado cada 2 minutos
setInterval(cleanExpiredCache, 2 * 60 * 1000);

// Exportar función de invalidación para uso externo
api.invalidateCache = invalidateCache;
api.clearCache = () => cache.clear();

export default api;
