import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@device_uuid';

let cachedDeviceId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedDeviceId) return cachedDeviceId;

  // 优先从 AsyncStorage 读取已缓存的设备 ID
  const cached = await AsyncStorage.getItem(STORAGE_KEY);
  if (cached) {
    cachedDeviceId = cached;
    return cached;
  }

  // 首次安装生成唯一 ID 并持久化
  const id = `android_${Math.random().toString(36).substr(2, 9)}_${Date.now()}`;
  cachedDeviceId = id;
  await AsyncStorage.setItem(STORAGE_KEY, id);
  return id;
}
