import React, { useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppInfo } from '../../../core/types/domain.types';
import { copy } from '../../../shared/copy';
import { staggerDelay } from '../../../shared/motion/stagger';
import { useEntrance } from '../../../shared/motion/use-entrance';
import { usePulse } from '../../../shared/motion/use-pulse';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { PressableScale } from '../../../shared/ui/pressable-scale';
import { ScreenHeader } from '../../../shared/ui/screen-header';

interface AppPickerProps {
  apps: AppInfo[];
  search: string;
  loading: boolean;
  onSearch: (text: string) => void;
  onSelect: (app: AppInfo) => void;
  onClose: () => void;
}

function Row({
  app,
  index,
  onSelect,
}: {
  app: AppInfo;
  index: number;
  onSelect: () => void;
}) {
  const entrance = useEntrance(staggerDelay(index), 12);
  return (
    <Animated.View style={entrance}>
      <PressableScale
        accessibilityLabel={copy.addApp.rowA11y(app.appName)}
        onPress={onSelect}
        style={styles.row}
      >
        {app.iconBase64 ? (
          <Image source={{ uri: app.iconBase64 }} style={styles.icon} />
        ) : (
          <View style={[styles.icon, styles.iconFallback]}>
            <Text style={styles.iconLetter}>
              {app.appName.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.texts}>
          <Text style={styles.name} numberOfLines={1}>
            {app.appName}
          </Text>
          <Text style={styles.pkg} numberOfLines={1}>
            {app.packageName}
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </PressableScale>
    </Animated.View>
  );
}

function Skeleton() {
  const pulse = usePulse(true, 1.02);
  return (
    <View
      accessible
      accessibilityLabel={copy.addApp.loading}
      accessibilityState={{ busy: true }}
      style={styles.skeletons}
    >
      {[0, 1, 2, 3, 4, 5].map((key) => (
        <Animated.View
          key={key}
          style={[styles.skeleton, { transform: [{ scale: pulse }] }]}
        />
      ))}
    </View>
  );
}

/** Step one: choose which app to limit. */
export function AppPicker({
  apps,
  search,
  loading,
  onSearch,
  onSelect,
  onClose,
}: AppPickerProps) {
  const [focused, setFocused] = useState(false);
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={copy.addApp.pickTitle} onBack={onClose} />
      <View style={styles.searchWrap}>
        <TextInput
          style={[styles.search, focused && styles.searchFocused]}
          placeholder={copy.addApp.searchPlaceholder}
          placeholderTextColor={palette.textDisabled}
          value={search}
          onChangeText={onSearch}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize="none"
          accessibilityLabel={copy.addApp.searchA11y}
        />
      </View>
      {loading ? (
        <Skeleton />
      ) : (
        <FlatList
          data={apps}
          keyExtractor={(item) => item.packageName}
          renderItem={({ item, index }) => (
            <Row app={item} index={index} onSelect={() => onSelect(item)} />
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {copy.addApp.noMatch(search.trim())}
            </Text>
          }
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.canvas },
  searchWrap: { paddingHorizontal: space.xl, paddingBottom: space.md },
  search: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: space.lg,
    color: palette.textPrimary,
    fontSize: 16,
  },
  searchFocused: { borderColor: palette.primary },
  list: { paddingHorizontal: space.xl, paddingBottom: space.huge },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    marginBottom: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  icon: { width: 44, height: 44, borderRadius: radius.sm },
  iconFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.raised,
  },
  iconLetter: { ...typography.heading, color: palette.primary },
  texts: { flex: 1 },
  name: { ...typography.heading, color: palette.textPrimary },
  pkg: { ...typography.caption, color: palette.textDisabled },
  chevron: { fontSize: 24, color: palette.textSecondary },
  empty: {
    ...typography.body,
    color: palette.textSecondary,
    textAlign: 'center',
    paddingVertical: space.xxl,
  },
  skeletons: { paddingHorizontal: space.xl, gap: space.sm },
  skeleton: {
    height: 68,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
  },
});
