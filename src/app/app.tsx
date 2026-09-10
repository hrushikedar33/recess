import React, { useEffect } from 'react';
import { DeviceEventEmitter, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppProviders from './providers/app-providers';
import RootNavigator from './navigation/root-navigator';
import { navigationRef } from './navigation/navigation-ref';
import { Routes } from './navigation/routes';
import { LimitReachedPayload } from '../core/types/domain.types';

export default function App() {
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      'APP_LIMIT_REACHED',
      (payload: LimitReachedPayload) => {
        if (navigationRef.isReady()) {
          navigationRef.navigate(Routes.BlockOverlay, payload);
        }
      },
    );
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <AppProviders>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
      </AppProviders>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
