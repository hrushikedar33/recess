import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import HomeScreen from '../../features/home/home-screen';
import AddAppScreen from '../../features/add-app/add-app-screen';
import GoalsScreen from '../../features/goals/goals-screen';
import BreakScreen from '../../features/break/break-screen';
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
        name={Routes.Goals}
        component={GoalsScreen}
        options={{ title: 'Goals & To-dos' }}
      />
      <Stack.Screen
        name={Routes.Break}
        component={BreakScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}
