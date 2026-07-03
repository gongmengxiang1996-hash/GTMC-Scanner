import { useState, useEffect, useCallback } from 'react';
import { Table, Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import api from '../../services/api';

interface FailureRecord {
  id: string;
  file_name: string;
  created_at: string;
}

export default function ImportFailPage() {
  const [data, setData] = useState<FailureRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/supplier/codes/import-failures', { params: { page, pageSize: 20 } });
      setData(res.data.list);
      setTotal(res.data.total);
    } catch {
      message.error('加载失败');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDownload = async (id: string, fileName: string) => {
    try {
      const res = await api.get(`/supplier/codes/import-failures/${id}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/.csv$/i, '') + '_失败原因.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      message.error('下载失败');
    }
  };

  const columns: ColumnsType<FailureRecord> = [
    { title: '文件名', dataIndex: 'file_name', key: 'file_name', width: 300 },
    {
      title: '上传时间', dataIndex: 'created_at', key: 'created_at', width: 200,
      render: (v) => new Date(v).toLocaleString(),
    },
    {
      title: '操作', key: 'actions', width: 150,
      render: (_, record) => (
        <Button type="link" icon={<DownloadOutlined />} onClick={() => handleDownload(record.id, record.file_name)}>
          下载失败文件
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, color: '#666' }}>
        批量上传失败的记录保留48小时，超时自动删除。
      </div>
      <Table columns={columns} dataSource={data} rowKey="id" loading={loading}
        pagination={{
          current: page, total, pageSize: 20, onChange: setPage,
          showTotal: (t) => `共 ${t} 条`,
        }} />
    </div>
  );
}
