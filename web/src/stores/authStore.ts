import { create } from 'zustand';
import api from '../services/api';

interface User {
  sub: string;
  code?: string;
  username?: string;
  role: 'supplier' | 'admin';
}

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (account: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('access_token'),
  loading: false,

  login: async (account, password, role) => {
    set({ loading: true });
    try {
      const res = await api.post('/auth/login', { account, password, role });
      const { access_token, supplier_code, username } = res.data;

      const user: User = {
        sub: '',
        role: role as 'supplier' | 'admin',
        code: supplier_code,
        username,
      };

      localStorage.setItem('access_token', access_token);
      localStorage.setItem('user', JSON.stringify(user));

      set({ user, token: access_token, loading: false });
    } catch (e: any) {
      set({ loading: false });
      throw new Error(e.response?.data?.message || '登录失败');
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    set({ user: null, token: null });
  },

  changePassword: async (oldPassword, newPassword) => {
    await api.put('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
  },
}));
