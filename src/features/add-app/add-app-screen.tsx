import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAddAppViewModel } from './use-add-app-view-model';

export default function AddAppScreen() {
  const {
    filteredApps,
    search,
    setSearch,
    loading,
    selectedApp,
    limitMinutes,
    setLimitMinutes,
    cooldownMinutes,
    setCooldownMinutes,
    saving,
    handleSave,
    handleBack,
    handleSelectApp,
    presetLimits,
    presetCooldowns,
  } = useAddAppViewModel();

  if (selectedApp) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.configScreen}>
          {/* App Preview */}
          <View style={styles.configHeader}>
            <View style={styles.bigIcon}>
              <Text style={styles.bigIconText}>
                {selectedApp.appName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.configAppName}>{selectedApp.appName}</Text>
            <Text style={styles.configAppPkg}>{selectedApp.packageName}</Text>
          </View>

          {/* Limit Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Daily limit</Text>
            <View style={styles.presetRow}>
              {presetLimits.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.presetChip,
                    limitMinutes === m && styles.presetChipActive,
                  ]}
                  onPress={() => setLimitMinutes(m)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      limitMinutes === m && styles.presetChipTextActive,
                    ]}
                  >
                    {m}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.presetDesc}>
              App will be blocked after {limitMinutes} minutes of daily use
            </Text>
          </View>

          {/* Cooldown Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cooldown period</Text>
            <View style={styles.presetRow}>
              {presetCooldowns.map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.presetChip,
                    cooldownMinutes === m && styles.presetChipActive,
                  ]}
                  onPress={() => setCooldownMinutes(m)}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      cooldownMinutes === m && styles.presetChipTextActive,
                    ]}
                  >
                    {m}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.presetDesc}>
              Wait {cooldownMinutes} minutes before you can reopen the app
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.configButtons}>
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>
                {saving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search apps..."
          placeholderTextColor="#555"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#FF4757" />
          <Text style={styles.loaderText}>Loading apps...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredApps}
          keyExtractor={(item) => item.packageName}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.appRow}
              onPress={() => handleSelectApp(item)}
            >
              <View style={styles.rowIcon}>
                <Text style={styles.rowIconText}>
                  {item.appName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={styles.rowAppName}>{item.appName}</Text>
                <Text style={styles.rowPkg}>{item.packageName}</Text>
              </View>
              <Text style={styles.rowChevron}>›</Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.appList}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 12,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loaderText: {
    color: '#555',
    fontSize: 14,
  },
  appList: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#161616',
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF4757',
  },
  rowInfo: {
    flex: 1,
  },
  rowAppName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  rowPkg: {
    fontSize: 11,
    color: '#444',
    marginTop: 2,
  },
  rowChevron: {
    color: '#333',
    fontSize: 22,
  },
  // Config screen
  configScreen: {
    flex: 1,
    paddingHorizontal: 24,
  },
  configHeader: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  bigIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#FF47571a',
    borderWidth: 1,
    borderColor: '#FF475740',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  bigIconText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#FF4757',
  },
  configAppName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  configAppPkg: {
    fontSize: 12,
    color: '#444',
    marginTop: 4,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#888',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  presetChipActive: {
    backgroundColor: '#FF47571a',
    borderColor: '#FF4757',
  },
  presetChipText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: '#FF4757',
  },
  presetDesc: {
    color: '#444',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 18,
  },
  configButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 'auto',
    paddingBottom: 24,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222',
  },
  backBtnText: {
    color: '#888',
    fontWeight: '600',
    fontSize: 15,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: '#FF4757',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
