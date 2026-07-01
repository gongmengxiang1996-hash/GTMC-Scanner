import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Upload, message, Space, Tag, Popconfirm } from 'antd';
import { PlusOutlined, UploadOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

interface SupplierItem {
  id: string;
  code: string;
  password_masked: string;
  device_id: string | null;
  is_active: boolean;
  created_at: string;
}

export default function SupplierManagePage() {
  const [data, setData] = useState<SupplierItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/suppliers', { params: { page, pageSize: 20, search } });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (values: any) => {
    try {
      await api.post('/admin/suppliers', values);
      message.success('创建成功，初始密码 123456');
      setAddOpen(false);
      form.resetFields();
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message || '创建失败');
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/admin/suppliers/${id}`);
    message.success('已停用');
    fetchData();
  };

  const handleUnbind = async (id: string) => {
    await api.post(`/admin/suppliers/${id}/unbind-device`);
    message.success('设备已解绑');
    fetchData();
  };

  const handleResetPassword = async (id: string, code: string) => {
    try {
      const res = await api.put(`/admin/suppliers/${id}/reset-password`);
      message.success(`供应商 ${res.data.code} 密码已重置为 ${res.data.new_password}`);
      fetchData();
    } catch {
      message.error('重置失败');
    }
  };

  const downloadTemplate = () => {
    const csv = '﻿供应商代码\n53140';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '供应商导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/admin/suppliers/import', formData);
      message.success(`导入完成: 成功 ${res.data.created}, 跳过 ${res.data.skipped}`);
      fetchData();
    } catch {
      message.error('导入失败');
    }
    return false;
  };

  const columns: ColumnsType<SupplierItem> = [
    { title: '供应商代码', dataIndex: 'code', key: 'code', width: 130 },
    {
      title: '密码', dataIndex: 'password_masked', key: 'password', width: 120,
      render: () => <span>******</span>,
    },
    {
      title: '设备绑定', dataIndex: 'device_id', key: 'device_id', width: 180,
      render: (v: string | null) => v ? <Tag color="blue">{v}</Tag> : <Tag>未绑定</Tag>,
    },
    {
      title: '状态', dataIndex: 'is_active', key: 'is_active', width: 80,
      render: (v: boolean) => v ? <Tag color="green">启用</Tag> : <Tag color="red">停用</Tag>,
    },
    {
      title: '操作', key: 'actions', width: 240,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确定重置该供应商密码？"
            description="密码将重置为 123456"
            onConfirm={() => handleResetPassword(record.id, record.code)}
          >
            <a>重置密码</a>
          </Popconfirm>
          {record.device_id && (
            <Popconfirm title="确定解除设备绑定？" onConfirm={() => handleUnbind(record.id)}>
              <a>解绑设备</a>
            </Popconfirm>
          )}
          <Popconfirm title="确定停用此供应商？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>停用</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input prefix={<SearchOutlined />} placeholder="搜索供应商代码" style={{ width: 280 }}
          value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} allowClear />
        <Space>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>模板下载</Button>
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".csv">
            <Button icon={<UploadOutlined />}>CSV批量导入</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>新增供应商</Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }} />

      <Modal title="新增供应商" open={addOpen} onCancel={() => setAddOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="code" rules={[{ required: true, pattern: /^[A-Z0-9]{5}$/, message: '5位数字+大写字母' }]}>
            <Input placeholder="供应商代码（5位数字+大写字母）" maxLength={5} style={{ textTransform: 'uppercase' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
