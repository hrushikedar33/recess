import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppProviders from './providers/app-providers';
import RootNavigator from './navigation/root-navigator';
import { navigationRef } from './navigation/navigation-ref';
import { useStartupSync } from './hooks/use-startup-sync';

export default function App() {
  useStartupSync();

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
