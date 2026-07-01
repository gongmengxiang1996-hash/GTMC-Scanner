import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { getDeviceId } from '../utils/device';

export default function ProfileScreen() {
  const { user, changePassword, logout } = useAuthStore();
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  const handleChangePwd = async () => {
    if (!oldPwd || !newPwd) {
      Alert.alert('提示', '请填写完整');
      return;
    }
    if (newPwd.length < 6) {
      Alert.alert('提示', '新密码至少6位');
      return;
    }
    setChanging(true);
    try {
      await changePassword(oldPwd, newPwd);
      Alert.alert('成功', '密码修改成功，请重新登录', [
        { text: '确定', onPress: logout },
      ]);
    } catch (e: any) {
      Alert.alert('修改失败', e.response?.data?.message || '请检查原密码是否正确');
    } finally {
      setChanging(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('确认', '确定退出登录？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', onPress: logout, style: 'destructive' },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>供应商代码</Text>
        <Text style={styles.value}>{user?.code}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>设备ID</Text>
        <Text style={styles.valueSmall}>{deviceId}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>修改密码</Text>
        <TextInput
          style={styles.input}
          placeholder="原密码"
          value={oldPwd}
          onChangeText={setOldPwd}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="新密码（至少6位）"
          value={newPwd}
          onChangeText={setNewPwd}
          secureTextEntry
        />
        <TouchableOpacity style={[styles.button, changing && styles.buttonDisabled]} onPress={handleChangePwd} disabled={changing}>
          <Text style={styles.buttonText}>{changing ? '修改中...' : '确认修改'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5', padding: 16 },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 20, marginBottom: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  label: { fontSize: 13, color: '#888', marginBottom: 4 },
  value: { fontSize: 20, fontWeight: 'bold', color: '#001529' },
  valueSmall: { fontSize: 12, color: '#666', fontFamily: 'monospace' },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12, color: '#001529' },
  input: {
    backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#e8e8e8', fontSize: 15,
  },
  button: { backgroundColor: '#1677ff', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  logoutButton: { backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24, borderWidth: 1, borderColor: '#ff4d4f' },
  logoutText: { color: '#ff4d4f', fontSize: 16, fontWeight: '600' },
});
