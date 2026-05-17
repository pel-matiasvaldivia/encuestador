import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const adminTargetTenant = localStorage.getItem('admin_target_tenant');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (adminTargetTenant) {
    config.headers['X-Tenant-ID'] = adminTargetTenant;
  }
  return config;
});

export default api;
