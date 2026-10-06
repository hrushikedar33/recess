import React from 'react';
import { FlatList, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlockedApp } from '../../core/types/domain.types';
import { copy } from '../../shared/copy';
import { palette, radius, space, typography } from '../../shared/theme/tokens';
import { Glow } from '../../shared/ui/glow';
import { Pill } from '../../shared/ui/pill';
import { PressableScale } from '../../shared/ui/pressable-scale';
import { AppCard } from './components/app-card';
import { EmptyApps } from './components/empty-apps';
import { GoalsCard } from './components/goals-card';
import { HealthStrip } from './components/health-strip';
import { NoticeCard } from './components/notice-card';
import { StatusCard } from './components/status-card';
import { useHomeViewModel } from './use-home-view-model';

export default function HomeScreen() {
  const {
    blockedApps,
    goalsSummary,
    handleOpenGoals,
    monitorHealth,
    interruptionNote,
    oemGuidance,
    handleDismissInterruption,
    handleDismissOemGuidance,
    handleOpenAppSettings,
    trackerEnabled,
    trackerBusy,
    shouldShowPermissionBanner,
    permissionBannerText,
    handleToggleTracker,
    handleToggleApp,
    handleRemoveApp,
    handleRequestPermission,
    handleAddApp,
  } = useHomeViewModel();

  const activeCount = blockedApps.filter((app) => app.isActive).length;

  const header = (
    <View style={styles.header}>
      <View style={styles.hero}>
        <Text style={styles.wordmark} accessibilityRole="header">
          {copy.home.title}
        </Text>
        <Text style={styles.tagline}>{copy.home.tagline}</Text>
      </View>

      <StatusCard
        enabled={trackerEnabled}
        busy={trackerBusy}
        activeCount={activeCount}
        onToggle={handleToggleTracker}
      />
      <HealthStrip
        health={monitorHealth}
        onOpenSettings={handleOpenAppSettings}
      />

      {interruptionNote !== null && (
        <NoticeCard
          body={interruptionNote}
          actions={[
            {
              label: copy.home.gotIt,
              accessibilityLabel: copy.home.dismissNote,
              onPress: handleDismissInterruption,
            },
          ]}
        />
      )}
      {oemGuidance !== null && (
        <NoticeCard
          title={oemGuidance.title}
          body={oemGuidance.steps}
          actions={[
            {
              label: copy.home.settings,
              accessibilityLabel: copy.home.settingsA11y,
              onPress: handleOpenAppSettings,
            },
            {
              label: copy.home.gotIt,
              accessibilityLabel: copy.home.dismissGuidance,
              onPress: handleDismissOemGuidance,
            },
          ]}
        />
      )}
      {shouldShowPermissionBanner && (
        <NoticeCard
          body={permissionBannerText}
          actions={[
            {
              label: copy.home.fixIt,
              accessibilityLabel: permissionBannerText,
              onPress: handleRequestPermission,
            },
          ]}
        />
      )}

      <GoalsCard
        done={goalsSummary.done}
        total={goalsSummary.total}
        onPress={handleOpenGoals}
      />

      {blockedApps.length > 0 && (
        <View style={styles.sectionRow}>
          <Text style={styles.section} accessibilityRole="header">
            {copy.home.apps.title}
          </Text>
          <Pill label={String(blockedApps.length)} tone="primary" />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={palette.canvas} />
      <Glow
        color={trackerEnabled ? palette.glowPrimary : palette.glowBlocked}
        size={420}
        style={styles.glow}
      />

      <FlatList
        data={blockedApps}
        keyExtractor={(item: BlockedApp) => item.packageName}
        renderItem={({ item, index }) => (
          <AppCard
            app={item}
            index={index}
            onToggle={() => handleToggleApp(item.packageName)}
            onRemove={() => handleRemoveApp(item)}
          />
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={<EmptyApps />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <View style={styles.footer} pointerEvents="box-none">
        <PressableScale
          accessibilityLabel={copy.home.addA11y}
          onPress={handleAddApp}
          style={styles.fab}
        >
          <Text style={styles.fabText}>{`+  ${copy.home.add}`}</Text>
        </PressableScale>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas, overflow: 'hidden' },
  glow: { position: 'absolute', top: -180, right: -180 },
  list: {
    paddingHorizontal: space.xl,
    paddingBottom: 128,
  },
  header: { gap: space.lg, paddingTop: space.lg, paddingBottom: space.md },
  hero: { gap: 2, paddingBottom: space.sm },
  wordmark: { ...typography.display, color: palette.textPrimary },
  tagline: { ...typography.body, fontSize: 16, color: palette.textSecondary },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  section: { ...typography.title, fontSize: 22, color: palette.textPrimary },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
  },
  fab: {
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { ...typography.heading, color: palette.onPrimary },
});
