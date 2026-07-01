import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  sub: string;
  code: string;
  role: 'supplier';
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (code: string, password: string, deviceId: string) => Promise<void>;
  logout: () => void;
  changePassword: (oldPwd: string, newPwd: string) => Promise<void>;
}

// 简易 AsyncStorage 模拟 localStorage（React Native 实际应使用 @react-native-async-storage）
const storage = {
  getItem: async (key: string) => {
    try { return await AsyncStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string) => {
    try { await AsyncStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key: string) => {
    try { await AsyncStorage.removeItem(key); } catch {}
  },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,

  login: async (code, password, deviceId) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', {
        account: code,
        password,
        role: 'supplier',
        device_id: deviceId,
      });
      const { access_token, supplier_code } = res.data;

      const user: User = { sub: '', code: supplier_code, role: 'supplier' };
      await storage.setItem('access_token', access_token);
      await storage.setItem('user', JSON.stringify(user));

      set({ user, token: access_token, loading: false });
    } catch (e: any) {
      set({ loading: false });
      const msg = e.response?.data?.message || '登录失败';
      throw new Error(msg);
    }
  },

  logout: async () => {
    await storage.removeItem('access_token');
    await storage.removeItem('user');
    set({ user: null, token: null });
  },

  changePassword: async (oldPwd, newPwd) => {
    await api.put('/auth/change-password', {
      old_password: oldPwd,
      new_password: newPwd,
    });
  },
}));
