import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { getDeviceId } from '../utils/device';

export default function LoginScreen() {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('123456');
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const { login, changePassword, loading } = useAuthStore();

  const handleLogin = async () => {
    if (!code.trim()) {
      Alert.alert('提示', '请输入供应商代码');
      return;
    }
    try {
      const deviceId = await getDeviceId();
      await login(code.trim().toUpperCase(), password, deviceId);
    } catch (e: any) {
      Alert.alert('登录失败', e.message);
    }
  };

  const handleChangePwd = async () => {
    if (newPwd.length < 6) {
      Alert.alert('提示', '新密码至少6位');
      return;
    }
    try {
      const deviceId = getDeviceId();
      await login(code.trim().toUpperCase(), oldPwd, deviceId);
      await changePassword(oldPwd, newPwd);
      Alert.alert('成功', '密码修改成功，请重新登录');
      useAuthStore.getState().logout();
      setShowChangePwd(false);
    } catch (e: any) {
      Alert.alert('修改失败', e.message);
    }
  };

  if (showChangePwd) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.title}>修改密码</Text>
        <TextInput style={styles.input} placeholder="供应商代码" value={code} onChangeText={setCode} autoCapitalize="characters" />
        <TextInput style={styles.input} placeholder="原密码" value={oldPwd} onChangeText={setOldPwd} secureTextEntry />
        <TextInput style={styles.input} placeholder="新密码（至少6位）" value={newPwd} onChangeText={setNewPwd} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleChangePwd}>
          <Text style={styles.buttonText}>确认修改</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowChangePwd(false)}>
          <Text style={styles.link}>返回登录</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>GTMC铁笼标签预扫描系统</Text>

      <TextInput
        style={styles.input}
        placeholder="供应商代码（5位）"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        maxLength={5}
      />
      <TextInput
        style={styles.input}
        placeholder="密码"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>登录</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setShowChangePwd(true)}>
        <Text style={styles.link}>修改密码</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#f0f2f5' },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 8, color: '#001529' },
  subtitle: { fontSize: 14, textAlign: 'center', color: '#888', marginBottom: 32 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#d9d9d9', fontSize: 16 },
  button: { backgroundColor: '#1677ff', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#1677ff', textAlign: 'center', marginTop: 16, fontSize: 14 },
});
