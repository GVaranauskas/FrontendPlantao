import axios from 'axios';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';
const API_TIMEOUT =
  Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(
      import.meta.env.VITE_AUTH_TOKEN_KEY || 'auth_token'
    );
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      switch (error.response.status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem(
            import.meta.env.VITE_AUTH_TOKEN_KEY || 'auth_token'
          );
          window.location.href = '/login';
          break;
        case 403:
          console.error('Forbidden - você não tem permissão para acessar este recurso');
          break;
        case 404:
          console.error('Not Found - recurso não encontrado');
          break;
        case 500:
          console.error('Internal Server Error - erro no servidor');
          break;
        default:
          console.error('Erro na requisição:', error.response.data);
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Sem resposta do servidor:', error.request);
    } else {
      // Error in setting up the request
      console.error('Erro ao configurar requisição:', error.message);
    }
    return Promise.reject(error);
  }
);
