import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../../features/home/home-screen';
import AddAppScreen from '../../features/add-app/add-app-screen';
import BlockOverlayScreen from '../../features/block-overlay/block-overlay-screen';
import { RootStackParamList } from './types';
import { Routes } from './routes';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        cardStyle: { backgroundColor: '#0a0a0a' },
      }}
    >
      <Stack.Screen
        name={Routes.Home}
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name={Routes.AddApp}
        component={AddAppScreen}
        options={{ title: 'Choose App' }}
      />
      <Stack.Screen
        name={Routes.BlockOverlay}
        component={BlockOverlayScreen}
        options={{
          headerShown: false,
          gestureEnabled: false,
          presentation: 'modal',
        }}
      />
    </Stack.Navigator>
  );
}
