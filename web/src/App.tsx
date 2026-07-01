import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import CodeManagePage from './pages/supplier/CodeManagePage';
import SupplierManagePage from './pages/admin/SupplierManagePage';
import BoxTypeManagePage from './pages/admin/BoxTypeManagePage';
import LogViewPage from './pages/admin/LogViewPage';

function PrivateRoute({ children, role }: { children: React.ReactNode; role?: 'supplier' | 'admin' }) {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const allowed = user && (!role || user.role === role);
  useEffect(() => {
    if (!allowed) navigate('/login', { replace: true });
  }, [allowed, navigate]);
  if (!allowed) return null;
  return <>{children}</>;
}

function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ background: '#001529', color: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <span style={{ fontWeight: 'bold' }}>GTMC铁笼标签预扫描系统 - 管理员</span>
          <a href="/admin/suppliers" style={{ color: '#fff' }}>供应商管理</a>
          <a href="/admin/box-types" style={{ color: '#fff' }}>箱种管理</a>
          <a href="/admin/logs" style={{ color: '#fff' }}>日志记录</a>
        </div>
        <div>
          <span style={{ marginRight: 16 }}>{user?.username}</span>
          <a onClick={handleLogout} style={{ color: '#ff4d4f', cursor: 'pointer' }}>退出登录</a>
        </div>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

function SupplierLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ background: '#001529', color: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <span style={{ fontWeight: 'bold' }}>GTMC铁笼标签预扫描系统</span>
          <a href="/supplier/codes" style={{ color: '#fff' }}>编码字符串管理</a>
        </div>
        <div>
          <span style={{ marginRight: 16 }}>{user?.code}</span>
          <a onClick={handleLogout} style={{ color: '#ff4d4f', cursor: 'pointer' }}>退出登录</a>
        </div>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/supplier/codes"
        element={
          <PrivateRoute role="supplier">
            <SupplierLayout><CodeManagePage /></SupplierLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/suppliers"
        element={
          <PrivateRoute role="admin">
            <AdminLayout><SupplierManagePage /></AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/box-types"
        element={
          <PrivateRoute role="admin">
            <AdminLayout><BoxTypeManagePage /></AdminLayout>
          </PrivateRoute>
        }
      />
      <Route
        path="/admin/logs"
        element={
          <PrivateRoute role="admin">
            <AdminLayout><LogViewPage /></AdminLayout>
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}
