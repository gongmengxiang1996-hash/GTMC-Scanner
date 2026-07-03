import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ★ 真机调试：改为你电脑的局域网 IP
//    cmd 输入 ipconfig 查看 "无线局域网适配器 WLAN" 的 IPv4 地址
const DEV_SERVER_IP = '192.168.31.60';

const BASE_URL = 'https://gtmc-scanner.pages.dev/api';



const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// 请求拦截器 — 注入 JWT
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 — 401 清除凭据
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(err);
  },
);

export { BASE_URL };
export default api;
