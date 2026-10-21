import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_URL = 'http://10.0.2.2:4000/api/v1';
export const api = axios.create({ baseURL: API_URL, timeout: 60000 });
api.interceptors.request.use(async (config) => { const token = await AsyncStorage.getItem('accessToken'); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
let isRefreshing = false;
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshing) {
      originalRequest._retry = true; isRefreshing = true;
      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        await AsyncStorage.setItem('accessToken', data.accessToken);
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch { await AsyncStorage.multiRemove(['accessToken', 'refreshToken']); }
      finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  },
);
