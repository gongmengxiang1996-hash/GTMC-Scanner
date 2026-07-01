import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Upload, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, UploadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

interface BoxType {
  id: string;
  name: string;
  max_scan_count: number;
  created_at: string;
}

export default function BoxTypeManagePage() {
  const [data, setData] = useState<BoxType[]>([]);
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<BoxType | null>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/box-types');
      setData(res.data);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (values: any) => {
    try {
      if (editRecord) {
        await api.put(`/admin/box-types/${editRecord.id}`, values);
        message.success('修改成功');
      } else {
        await api.post('/admin/box-types', values);
        message.success('创建成功');
      }
      setAddOpen(false);
      setEditRecord(null);
      form.resetFields();
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/admin/box-types/${id}`);
    message.success('已删除');
    fetchData();
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/admin/box-types/import', formData);
      message.success(`导入完成: 成功 ${res.data.created}, 跳过 ${res.data.skipped}`);
      fetchData();
    } catch {
      message.error('导入失败');
    }
    return false;
  };

  const columns: ColumnsType<BoxType> = [
    { title: '箱种名称', dataIndex: 'name', key: 'name', width: 200 },
    { title: '扫描次数上限', dataIndex: 'max_scan_count', key: 'max_scan_count', width: 150 },
    {
      title: '操作', key: 'actions', width: 200,
      render: (_, record) => (
        <Space>
          <a onClick={() => { setEditRecord(record); form.setFieldsValue(record); setAddOpen(true); }}>编辑</a>
          <Popconfirm title="确定删除此箱种？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".csv">
            <Button icon={<UploadOutlined />}>CSV批量导入</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); form.resetFields(); setAddOpen(true); }}>新增箱种</Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />

      <Modal title={editRecord ? '编辑箱种' : '新增箱种'} open={addOpen} onCancel={() => { setAddOpen(false); setEditRecord(null); }}
        onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" rules={[{ required: true, message: '请输入箱种名称' }]}>
            <Input placeholder="箱种名称" />
          </Form.Item>
          <Form.Item name="max_scan_count" rules={[{ required: true, message: '请输入扫描次数上限' }]}>
            <InputNumber min={1} placeholder="扫描次数上限" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
