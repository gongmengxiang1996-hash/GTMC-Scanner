import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useCodeScanner,
} from 'react-native-vision-camera';
import { useAuthStore } from '../stores/authStore';
import { getDeviceId } from '../utils/device';
import api from '../services/api';

interface ScanResult {
  success: boolean;
  message: string;
  code?: string;
  scan_count?: number;
  max_scan_count?: number;
  box_type?: string;
  error_code?: string;
}

export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuthStore();
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const isScanning = useRef(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  const handleBarCodeScanned = useCallback(async (code: string) => {
    if (isScanning.current) return;
    isScanning.current = true;
    try {
      const deviceId = await getDeviceId();
      const res = await api.post('/scan', { code, device_id: deviceId });
      const result: ScanResult = res.data;
      setLastResult(result);
      setShowModal(true);
    } catch (e: any) {
      const msg = e.response?.data?.message || '网络不可用';
      setLastResult({ success: false, message: msg, error_code: 'NETWORK_ERROR' });
      setShowModal(true);
    } finally {
      setTimeout(() => { isScanning.current = false; }, 1500);
    }
  }, []);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13', 'ean-8', 'code-128', 'code-39', 'code-93', 'codabar'],
    onCodeScanned: (codes: any[]) => {
      if (isScanning.current || codes.length === 0) return;
      const code = codes[0].value;
      if (code) handleBarCodeScanned(code);
    },
  });

  const getResultColor = () => {
    if (!lastResult) return '#d9d9d9';
    return lastResult.success ? '#52c41a' : '#ff4d4f';
  };

  const remaining = lastResult?.max_scan_count != null && lastResult?.scan_count != null
    ? lastResult.max_scan_count - lastResult.scan_count
    : null;

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>需要相机权限才能扫码</Text>
        <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
          <Text style={styles.permissionBtnText}>授予权限</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>未检测到后置摄像头</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={true}
        codeScanner={codeScanner}
        torch="on"
      />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{user?.code}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.profileBtn}>个人</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.scannerArea}>
        <View style={styles.scannerFrame}>
          <View style={[styles.scanLine, { backgroundColor: getResultColor() }]} />
        </View>
      </View>

      <View style={[styles.resultPanel, { borderTopColor: getResultColor() }]}>
        {lastResult ? (
          <>
            <Text style={[styles.resultText, { color: getResultColor() }]}>
              {lastResult.success ? '✔ 扫描成功' : '✖ ' + lastResult.message}
            </Text>
            {lastResult.scan_count !== undefined && (
              <Text style={styles.scanCount}>
                已扫描 {lastResult.scan_count} / {lastResult.max_scan_count} 次
                {lastResult.box_type && ` (${lastResult.box_type})`}
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.placeholderText}>将二维码对准框内</Text>
        )}
      </View>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {lastResult?.error_code === 'OVER_LIMIT' ? (
              <>
                <Text style={[styles.modalTitle, { color: '#ff4d4f' }]}>警告</Text>
                <Text style={styles.overLimitWarn}>
                  扫描次数超过{lastResult.max_scan_count}次，请检查标签是否重复
                </Text>
                {lastResult?.code && (
                  <Text style={styles.overLimitCode}>编码: {lastResult.code}</Text>
                )}
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#ff4d4f' }]}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.modalBtnText}>确认</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.modalTitle, { color: getResultColor() }]}>
                  {lastResult?.success ? '扫描成功' : '扫描失败'}
                </Text>

                {lastResult?.code && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>编码</Text>
                    <Text style={styles.modalCode}>{lastResult.code}</Text>
                  </View>
                )}

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>结果</Text>
                  <Text style={[styles.modalValue, { color: getResultColor() }]}>
                    {lastResult?.message}
                  </Text>
                </View>

                {lastResult?.scan_count !== undefined && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>扫描次数</Text>
                    <Text style={styles.modalValue}>
                      已扫 {lastResult.scan_count} 次 / 上限 {lastResult.max_scan_count} 次
                      {remaining != null && `（剩余 ${remaining} 次）`}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: getResultColor() }]}
                  onPress={() => setShowModal(false)}
                >
                  <Text style={styles.modalBtnText}>确定</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#000', padding: 32,
  },
  permissionText: { color: '#fff', fontSize: 16, marginBottom: 20, textAlign: 'center' },
  permissionBtn: {
    backgroundColor: '#1677ff', borderRadius: 8,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  permissionBtnText: { color: '#fff', fontSize: 16 },
  header: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    backgroundColor: 'rgba(0,21,41,0.85)',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  profileBtn: { color: '#1677ff', fontSize: 16 },
  scannerArea: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  scannerFrame: {
    width: 260, height: 260, borderWidth: 2, borderColor: '#1677ff',
    borderRadius: 16, justifyContent: 'center', alignItems: 'center',
  },
  scanLine: { width: 240, height: 2 },
  resultPanel: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 3, padding: 24, paddingBottom: 80,
    backgroundColor: 'rgba(26,26,26,0.92)',
    justifyContent: 'center', alignItems: 'center',
  },
  resultText: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  scanCount: { fontSize: 16, color: '#aaa' },
  placeholderText: { fontSize: 16, color: '#aaa' },
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    width: 300, backgroundColor: '#fff', borderRadius: 12,
    padding: 24, alignItems: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  modalRow: { width: '100%', marginBottom: 12 },
  modalLabel: { fontSize: 13, color: '#888', marginBottom: 2 },
  modalCode: { fontSize: 15, color: '#333', fontWeight: '600', fontFamily: 'monospace' },
  modalValue: { fontSize: 15, color: '#333' },
  modalBtn: {
    marginTop: 8, borderRadius: 8,
    paddingHorizontal: 40, paddingVertical: 12,
  },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  overLimitWarn: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 12, lineHeight: 24 },
  overLimitCode: { fontSize: 13, color: '#888', fontFamily: 'monospace', marginBottom: 20 },
});
