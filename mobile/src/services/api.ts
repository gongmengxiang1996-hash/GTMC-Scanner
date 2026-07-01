import axios from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ★ 真机调试：改为你电脑的局域网 IP
//    cmd 输入 ipconfig 查看 "无线局域网适配器 WLAN" 的 IPv4 地址
const DEV_SERVER_IP = '192.168.31.60';

const BASE_URL = __DEV__
  ? 'http://localhost:3000/api'  // ADB reverse 转发到电脑，切换WiFi无需改IP
  : 'http://localhost:3000/api'; // 生产环境按实际部署地址修改

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
