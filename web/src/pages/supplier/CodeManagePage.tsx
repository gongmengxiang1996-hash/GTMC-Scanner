import { useState, useEffect, useCallback } from 'react';
import { Table, Button, Modal, Form, Input, Select, Upload, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, UploadOutlined, SearchOutlined, QrcodeOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import QRCode from 'qrcode';
import api from '../../services/api';

interface CodeStringItem {
  id: string;
  code: string;
  scan_count: number;
  box_type_name: string;
  box_type_id: string;
  created_at: string;
}

interface BoxType {
  id: string;
  name: string;
  max_scan_count: number;
}

export default function CodeManagePage() {
  const [data, setData] = useState<CodeStringItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [boxTypes, setBoxTypes] = useState<BoxType[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [scanRecords, setScanRecords] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form] = Form.useForm();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/supplier/codes', { params: { page, pageSize: 20, search } });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchBoxTypes = async () => {
    try {
      const res = await api.get('/admin/box-types');
      setBoxTypes(res.data);
    } catch {
      message.error('加载箱种列表失败');
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async (values: any) => {
    try {
      await api.post('/supplier/codes', values);
      message.success('新增成功');
      setAddOpen(false);
      form.resetFields();
      fetchData();
    } catch (e: any) {
      message.error(e.response?.data?.message || '新增失败');
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/supplier/codes/${id}`);
    message.success('已删除');
    fetchData();
  };

  const handleImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await api.post('/supplier/codes/import', formData);
      message.success(`导入完成: 成功 ${res.data.created}, 跳过 ${res.data.skipped}`);
      fetchData();
    } catch {
      message.error('导入失败');
    }
    return false; // 阻止默认上传
  };

  const showScanRecords = async (id: string) => {
    setSelectedId(id);
    setDetailOpen(true);
    const res = await api.get(`/supplier/codes/${id}/scan-records`, { params: { page: 1, pageSize: 50 } });
    setScanRecords(res.data.list);
  };

  const downloadTemplate = () => {
    const csv = '﻿编码,箱种名称\nW531400000S18181100001,标准箱';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '编码导入模板.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadQRCode = async (item: CodeStringItem) => {
    const qrData = item.code;
    const size = 1181; // 20cm at ~150 DPI
    const qrSize = 900;
    const qrOffsetX = (size - qrSize) / 2;
    const qrOffsetY = 60;
    // 生成二维码
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, qrData, {
      width: qrSize,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    // 合成画布
    const combined = document.createElement('canvas');
    combined.width = size;
    combined.height = size;
    const ctx = combined.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(qrCanvas, qrOffsetX, qrOffsetY);
    // 底部编码文字
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 90px "Times New Roman"';
    ctx.textAlign = 'center';
    ctx.fillText(item.code, size / 2, qrOffsetY + qrSize + 80);
    // 导出 JPG
    combined.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.code}.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  };

  const columns: ColumnsType<CodeStringItem> = [
    { title: '编码字符串', dataIndex: 'code', key: 'code', width: 220 },
    { title: '被扫描次数', dataIndex: 'scan_count', key: 'scan_count', width: 120 },
    { title: '箱种', dataIndex: 'box_type_name', key: 'box_type_name', width: 150 },
    {
      title: '操作', key: 'actions', width: 320,
      render: (_, record) => (
        <Space>
          <a onClick={() => showScanRecords(record.id)}>扫描记录</a>
          <a onClick={() => downloadQRCode(record)} title="下载二维码">
            <QrcodeOutlined /> 二维码
          </a>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record.id)}>
            <a style={{ color: '#ff4d4f' }}>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索编码字符串"
          style={{ width: 280 }}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          allowClear
        />
        <Space>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>模板下载</Button>
          <Upload beforeUpload={handleImport} showUploadList={false} accept=".csv">
            <Button icon={<UploadOutlined />}>CSV导入</Button>
          </Upload>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { fetchBoxTypes(); setAddOpen(true); }}>新增字符串</Button>
        </Space>
      </div>

      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 20, onChange: setPage, showTotal: (t) => `共 ${t} 条` }} />

      <Modal title="新增编码字符串" open={addOpen} onCancel={() => setAddOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item name="code" rules={[{ required: true, pattern: /^[A-Za-z0-9]{22}$/, message: '22位字母+数字' }]}>
            <Input placeholder="22位编码字符串" maxLength={22} />
          </Form.Item>
          <Form.Item name="box_type_id" rules={[{ required: true, message: '请选择箱种' }]}>
            <Select options={boxTypes.map(b => ({ label: `${b.name} (上限${b.max_scan_count}次)`, value: b.id }))} placeholder="选择箱种" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="扫描记录" open={detailOpen} onCancel={() => setDetailOpen(false)} footer={null} width={600}>
        <Table dataSource={scanRecords} rowKey="id" size="small"
          columns={[
            { title: '设备ID', dataIndex: 'device_id' },
            { title: '扫描时间', dataIndex: 'scanned_at', render: (v) => new Date(v).toLocaleString() },
            { title: '是否超限', dataIndex: 'is_over_limit', render: (v) => v ? <Tag color="red">超限</Tag> : <Tag color="green">正常</Tag> },
          ]}
          pagination={false} />
      </Modal>
    </div>
  );
}
