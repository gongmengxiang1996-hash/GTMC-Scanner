import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuthStore } from './src/stores/authStore';
import LoginScreen from './src/screens/LoginScreen';
import ScanScreen from './src/screens/ScanScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();

export default function App() {
  const user = useAuthStore((s) => s.user);

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ title: 'GTMC铁笼标签预扫描系统' }} />
        ) : (
          <>
            <Stack.Screen name="Scan" component={ScanScreen} options={{ title: '扫码', headerShown: false }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '个人中心' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
