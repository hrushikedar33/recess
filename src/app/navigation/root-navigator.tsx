import React from 'react';
import {
  TransitionPresets,
  createStackNavigator,
} from '@react-navigation/stack';
import HomeScreen from '../../features/home/home-screen';
import AddAppScreen from '../../features/add-app/add-app-screen';
import GoalsScreen from '../../features/goals/goals-screen';
import BreakScreen from '../../features/break/break-screen';
import { palette } from '../../shared/theme/tokens';
import { RootStackParamList } from './types';
import { Routes } from './routes';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        // Every screen draws its own header (ScreenHeader), in the app's own style.
        headerShown: false,
        cardStyle: { backgroundColor: palette.canvas },
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <Stack.Screen name={Routes.Home} component={HomeScreen} />
      <Stack.Screen name={Routes.AddApp} component={AddAppScreen} />
      <Stack.Screen name={Routes.Goals} component={GoalsScreen} />
      {/* The takeover rises from the bottom: it is not "another page", it interrupts. */}
      <Stack.Screen
        name={Routes.Break}
        component={BreakScreen}
        options={TransitionPresets.FadeFromBottomAndroid}
      />
    </Stack.Navigator>
  );
}
