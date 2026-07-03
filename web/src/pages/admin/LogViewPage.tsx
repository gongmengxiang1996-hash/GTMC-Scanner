import { useState, useEffect, useCallback } from 'react';
import { Table, Tabs, Input, Button, message, Tag, Popconfirm } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

export default function LogViewPage() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [alertData, setAlertData] = useState<any[]>([]);
  const [alertTotal, setAlertTotal] = useState(0);
  const [alertPage, setAlertPage] = useState(1);
  const [alertSearch, setAlertSearch] = useState('');
  const [unregData, setUnregData] = useState<any[]>([]);
  const [unregTotal, setUnregTotal] = useState(0);
  const [unregPage, setUnregPage] = useState(1);
  const [auditData, setAuditData] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: alertPage, pageSize: 20 };
      if (alertSearch) params.search = alertSearch;
      const res = await api.get('/admin/monitor/alert-logs', { params });
      setAlertData(res.data.list);
      setAlertTotal(res.data.total);
    } catch {
      message.error('加载告警日志失败');
    } finally {
      setLoading(false);
    }
  }, [alertPage, alertSearch]);

  const fetchUnreg = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/monitor/unregistered-attempts', { params: { page: unregPage, pageSize: 20 } });
      setUnregData(res.data.list);
      setUnregTotal(res.data.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [unregPage]);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/monitor/audit-logs', { params: { page: auditPage, pageSize: 20 } });
      setAuditData(res.data.list);
      setAuditTotal(res.data.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [auditPage]);

  useEffect(() => {
    if (activeTab === 'alerts') fetchAlerts();
    else if (activeTab === 'unreg') fetchUnreg();
    else fetchAudit();
  }, [activeTab, fetchAlerts, fetchUnreg, fetchAudit]);

  const handleResetAlert = async (id: string) => {
    try {
      await api.put(`/admin/monitor/alert-logs/${id}/reset`);
      message.success('已重置');
      fetchAlerts();
    } catch {
      message.error('重置失败');
    }
  };

  const alertColumns: ColumnsType<any> = [
    { title: '供应商', dataIndex: 'supplier_code', width: 100 },
    { title: '编码字符串', dataIndex: 'code_string', width: 240 },
    { title: '告警内容', dataIndex: 'message', ellipsis: true },
    {
      title: '标签重置状态', dataIndex: 'is_reset', width: 120,
      render: (v) => v ? <Tag color="green">已重置</Tag> : <Tag color="orange">未重置</Tag>,
    },
    { title: '扫描次数', dataIndex: 'scan_count', width: 80, render: (v) => v != null ? v : '-' },
    { title: '时间', dataIndex: 'created_at', width: 170, render: (v) => new Date(v).toLocaleString() },
    {
      title: '操作', key: 'actions', width: 100,
      render: (_, record) => (
        record.is_reset ? (
          <span style={{ color: '#999' }}>已重置</span>
        ) : (
          <Popconfirm title="确定重置该告警？" onConfirm={() => handleResetAlert(record.id)}>
            <Button type="link" size="small" icon={<ReloadOutlined />} style={{ color: '#1677ff' }}>
              重置
            </Button>
          </Popconfirm>
        )
      ),
    },
  ];

  const unregColumns: ColumnsType<any> = [
    { title: '供应商', dataIndex: 'supplier_code', width: 120 },
    { title: '扫描的编码', dataIndex: 'code_string', width: 240 },
    { title: '设备ID', dataIndex: 'device_id', width: 200 },
    { title: '时间', dataIndex: 'attempted_at', width: 180, render: (v) => new Date(v).toLocaleString() },
  ];

  const auditColumns: ColumnsType<any> = [
    { title: '用户类型', dataIndex: 'user_type', width: 100, render: (v) => v === 'admin' ? <Tag color="blue">管理员</Tag> : <Tag>供应商</Tag> },
    { title: '操作', dataIndex: 'action', width: 150 },
    { title: '详情', dataIndex: 'detail', ellipsis: true },
    { title: '时间', dataIndex: 'created_at', width: 180, render: (v) => new Date(v).toLocaleString() },
  ];

  return (
    <div>
      <Tabs activeKey={activeTab} onChange={(key) => { setActiveTab(key); }} items={[
        {
          key: 'alerts', label: '超限告警',
          children: (
            <>
              <div style={{ marginBottom: 16 }}>
                <Input
                  prefix={<SearchOutlined />}
                  placeholder="搜索22位编码字符串"
                  style={{ width: 300 }}
                  value={alertSearch}
                  onChange={(e) => { setAlertSearch(e.target.value); setAlertPage(1); }}
                  allowClear
                />
              </div>
              <Table columns={alertColumns} dataSource={alertData} rowKey="id" loading={loading}
                pagination={{ current: alertPage, total: alertTotal, pageSize: 20, onChange: setAlertPage, showTotal: (t) => `共 ${t} 条` }} />
            </>
          ),
        },
        {
          key: 'unreg', label: '未注册标签扫描',
          children: (
            <Table columns={unregColumns} dataSource={unregData} rowKey="id" loading={loading}
              pagination={{ current: unregPage, total: unregTotal, pageSize: 20, onChange: setUnregPage, showTotal: (t) => `共 ${t} 条` }} />
          ),
        },
        {
          key: 'audit', label: '操作审计日志 (保留90天)',
          children: (
            <Table columns={auditColumns} dataSource={auditData} rowKey="id" loading={loading}
              pagination={{ current: auditPage, total: auditTotal, pageSize: 20, onChange: setAuditPage, showTotal: (t) => `共 ${t} 条` }} />
          ),
        },
      ]} />
    </div>
  );
}
