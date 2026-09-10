import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Switch,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlockedApp } from '../../core/types/domain.types';
import { useHomeViewModel } from './use-home-view-model';

export default function HomeScreen() {
  const {
    blockedApps,
    trackerRunning,
    trackerBusy,
    shouldShowPermissionBanner,
    permissionBannerText,
    handleToggleTracker,
    handleToggleApp,
    handleRemoveApp,
    handleRequestPermission,
    handleAddApp,
  } = useHomeViewModel();

  const renderApp = ({ item }: { item: BlockedApp }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        {item.iconBase64 ? (
          <Image
            source={{ uri: item.iconBase64 }}
            style={styles.appIconImage}
          />
        ) : (
          <View style={styles.appIconPlaceholder}>
            <Text style={styles.appIconText}>
              {item.appName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>{item.appName}</Text>
          <Text style={styles.appMeta}>
            {item.limitMinutes} min limit · {item.cooldownMinutes} min cooldown
          </Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Switch
          value={item.isActive}
          onValueChange={() => handleToggleApp(item.packageName)}
          trackColor={{ false: '#2a2a2a', true: '#FF475740' }}
          thumbColor={item.isActive ? '#FF4757' : '#555'}
        />
        <TouchableOpacity
          onPress={() => handleRemoveApp(item)}
          style={styles.removeBtn}
        >
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0a0a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Recess</Text>
          <Text style={styles.headerSub}>Take back your time</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.trackerToggle,
            trackerRunning && styles.trackerToggleActive,
            trackerBusy && styles.trackerToggleDisabled,
          ]}
          onPress={handleToggleTracker}
          disabled={trackerBusy}
        >
          <View style={[styles.dot, trackerRunning && styles.dotActive]} />
          <Text
            style={[
              styles.trackerLabel,
              trackerRunning && styles.trackerLabelActive,
            ]}
          >
            {trackerRunning ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Permission Banner */}
      {shouldShowPermissionBanner && (
        <TouchableOpacity
          style={styles.permBanner}
          onPress={handleRequestPermission}
        >
          <Text style={styles.permBannerText}>
            {permissionBannerText}
          </Text>
        </TouchableOpacity>
      )}

      {/* App List */}
      {blockedApps.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📵</Text>
          <Text style={styles.emptyTitle}>No apps blocked yet</Text>
          <Text style={styles.emptyBody}>
            Add apps you want to limit and set a daily usage cap.
          </Text>
        </View>
      ) : (
        <FlatList
          data={blockedApps}
          keyExtractor={(item) => item.packageName}
          renderItem={renderApp}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={handleAddApp}>
        <Text style={styles.fabText}>+ Add App</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  trackerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
  },
  trackerToggleActive: {
    borderColor: '#FF475760',
    backgroundColor: '#FF47571a',
  },
  trackerToggleDisabled: {
    opacity: 0.6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#555',
  },
  dotActive: {
    backgroundColor: '#FF4757',
  },
  trackerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1,
  },
  trackerLabelActive: {
    color: '#FF4757',
  },
  permBanner: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#FF47571a',
    borderWidth: 1,
    borderColor: '#FF475740',
    borderRadius: 12,
    padding: 14,
  },
  permBannerText: {
    color: '#FF8B94',
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  appIconPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  appIconText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF4757',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  appMeta: {
    fontSize: 12,
    color: '#555',
    marginTop: 3,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeBtn: {
    padding: 4,
  },
  removeBtnText: {
    color: '#444',
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    bottom: 32,
    left: 24,
    right: 24,
    backgroundColor: '#FF4757',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  fabText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
