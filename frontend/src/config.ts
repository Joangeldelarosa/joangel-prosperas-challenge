const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Derive WebSocket URL from API_URL
const WS_URL = API_URL.replace(/^http/, 'ws');

export { API_URL, WS_URL };
