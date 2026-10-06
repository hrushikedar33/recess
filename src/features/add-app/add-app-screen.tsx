import React from 'react';
import { AppConfig } from './components/app-config';
import { AppPicker } from './components/app-picker';
import { useAddAppViewModel } from './use-add-app-view-model';

/** Two steps behind one route: pick an app, then set its limits. */
export default function AddAppScreen() {
  const vm = useAddAppViewModel();

  if (vm.selectedApp) {
    return (
      <AppConfig
        app={vm.selectedApp}
        limitMinutes={vm.limitMinutes}
        cooldownMinutes={vm.cooldownMinutes}
        dailyLimitMinutes={vm.dailyLimitMinutes}
        error={vm.error}
        canSave={vm.canSave}
        saving={vm.saving}
        presetLimits={vm.presetLimits}
        presetCooldowns={vm.presetCooldowns}
        presetDailyLimits={vm.presetDailyLimits}
        onLimit={vm.setLimitMinutes}
        onCooldown={vm.setCooldownMinutes}
        onDaily={vm.setDailyLimitMinutes}
        onSave={vm.handleSave}
        onBack={vm.handleBack}
      />
    );
  }

  return (
    <AppPicker
      apps={vm.filteredApps}
      search={vm.search}
      loading={vm.loading}
      onSearch={vm.setSearch}
      onSelect={vm.handleSelectApp}
      onClose={vm.handleClose}
    />
  );
}
