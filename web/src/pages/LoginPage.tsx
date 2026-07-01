import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Select, Card, message, Space } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const navigate = useNavigate();
  const { user, login, changePassword } = useAuthStore();

  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin/suppliers' : '/supplier/codes', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (values: any) => {
    setLoading(true);
    try {
      await login(values.account, values.password, values.role);
      message.success('登录成功');
    } catch (e: any) {
      message.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    try {
      // 先用默认密码登录获取 Token，再修改密码
      await login(values.account, values.old_password, values.role);
      await changePassword(values.old_password, values.new_password);
      message.success('密码修改成功，请重新登录');
      useAuthStore.getState().logout();
      setShowChangePwd(false);
    } catch (e: any) {
      message.error(e.message || '修改失败');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card title="GTMC铁笼标签预扫描系统" style={{ width: 400 }}>
        {!showChangePwd ? (
          <Form onFinish={handleLogin} layout="vertical">
            <Form.Item name="role" rules={[{ required: true, message: '请选择身份' }]} initialValue="supplier">
              <Select
                options={[
                  { label: '供应商', value: 'supplier' },
                  { label: '管理员', value: 'admin' },
                ]}
              />
            </Form.Item>
            <Form.Item name="account" rules={[{ required: true, message: '请输入账号' }]}>
              <Input prefix={<UserOutlined />} placeholder="供应商代码 / 管理员账号" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
            </Form.Item>
            <Space>
              <a onClick={() => setShowChangePwd(true)}>修改密码</a>
            </Space>
          </Form>
        ) : (
          <Form onFinish={handleChangePassword} layout="vertical">
            <Form.Item name="role" rules={[{ required: true }]} initialValue="supplier">
              <Select options={[{ label: '供应商', value: 'supplier' }, { label: '管理员', value: 'admin' }]} />
            </Form.Item>
            <Form.Item name="account" rules={[{ required: true }]}>
              <Input prefix={<UserOutlined />} placeholder="账号" />
            </Form.Item>
            <Form.Item name="old_password" rules={[{ required: true }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="原密码" />
            </Form.Item>
            <Form.Item name="new_password" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="新密码（至少6位）" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block>确认修改</Button>
            </Form.Item>
            <a onClick={() => setShowChangePwd(false)}>返回登录</a>
          </Form>
        )}
      </Card>
    </div>
  );
}
