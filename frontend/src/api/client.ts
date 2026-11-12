import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('floodshield_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const riskBadgeColor = (category: string): string => {
  switch (category?.toUpperCase()) {
    case 'CRITICAL':
      return 'bg-red-500/20 text-red-300 border-red-500/50';
    case 'SEVERE':
      return 'bg-orange-500/20 text-orange-300 border-orange-500/50';
    case 'HIGH':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/50';
    case 'MODERATE':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50';
    case 'LOW':
    default:
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
  }
};

export const riskPolygonColor = (category: string): string => {
  switch (category?.toUpperCase()) {
    case 'CRITICAL':
      return '#ef4444';
    case 'SEVERE':
      return '#f97316';
    case 'HIGH':
      return '#f59e0b';
    case 'MODERATE':
      return '#eab308';
    case 'LOW':
    default:
      return '#10b981';
  }
};
