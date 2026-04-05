import axios from 'axios';

const api = axios.create({
  baseURL:'https://smartpost-ai-3-0.onrender.com/api',
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check if error is 401 Unauthorized (token invalid/blacklisted)
    if (error.response && error.response.status === 401) {
      // Never broadcast logout for auth endpoints (login, register, etc.)
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      
      if (isAuthEndpoint) {
        console.log('[axios] ℹ️ Ignoring 401 on auth endpoint - expected for wrong credentials');
        return Promise.reject(error);
      }
      
      // Protection: Don't clear localStorage if token was set within last 5 seconds
      // This prevents clearing tokens that were just set during login from being
      // immediately invalidated by browser extensions or race conditions
      const tokenSetTime = localStorage.getItem('token_set_time');
      const now = Date.now();
      const recentlySet = tokenSetTime && (now - parseInt(tokenSetTime)) < 5000; // 5 seconds
      
      if (recentlySet) {
        console.warn('[axios] ⚠️ Ignoring 401 error - token was set recently, likely browser extension interference');
        return Promise.reject(error);
      }
      
      // Only broadcast logout if there was actually a token (user was logged in)
      // This prevents login attempts with wrong credentials from logging out other tabs
      const existingToken = localStorage.getItem('token');
      const wasLoggedIn = existingToken && localStorage.getItem('user');
      
      // Clear user data on token invalidation
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      localStorage.removeItem('token_set_time');
      
      // Only broadcast logout if user was actually logged in
      if (wasLoggedIn) {
        // Broadcast logout to all tabs via BroadcastChannel if available
        try {
          if (typeof BroadcastChannel !== 'undefined') {
            const channel = new BroadcastChannel('auth_channel');
            channel.postMessage({
              type: 'LOGOUT',
              reason: 'Token invalidated or expired'
            });
            channel.close();
          }
        } catch (err) {
          console.log('BroadcastChannel error:', err);
        }

        // Redirect to login if not already there
        if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
