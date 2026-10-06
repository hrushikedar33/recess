import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo, TextInput } from 'react-native';
import { AppConfig } from '@features/add-app/components/app-config';
import { AppPicker } from '@features/add-app/components/app-picker';
import BreakScreen from '@features/break/break-screen';
import { useBreakViewModel } from '@features/break/use-break-view-model';
import GoalsScreen from '@features/goals/goals-screen';
import { useGoalsViewModel } from '@features/goals/use-goals-view-model';
import HomeScreen from '@features/home/home-screen';
import { useHomeViewModel } from '@features/home/use-home-view-model';

jest.mock('@features/break/use-break-view-model');
jest.mock('@features/goals/use-goals-view-model');
jest.mock('@features/home/use-home-view-model');
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

const CONTROL_ROLES = [
  'button',
  'switch',
  'checkbox',
  'radio',
  'link',
] as const;

/** Every control must have a name a screen reader can say: real words, never just an emoji or a glyph. */
function expectEveryControlNamed() {
  let found = 0;
  for (const role of CONTROL_ROLES) {
    for (const element of screen.queryAllByRole(role)) {
      found += 1;
      const label = element.props.accessibilityLabel as string | undefined;
      expect({ role, label }).toEqual({
        role,
        label: expect.stringMatching(/[A-Za-z]{2,}/),
      });
    }
  }
  for (const input of screen.UNSAFE_queryAllByType(TextInput)) {
    expect(input.props.accessibilityLabel).toEqual(
      expect.stringMatching(/[A-Za-z]{2,}/),
    );
  }
  return found;
}

const noop = jest.fn();

beforeEach(() => {
  info.isReduceMotionEnabled.mockResolvedValue(true);
  info.addEventListener.mockReturnValue({ remove: jest.fn() });
});

describe('every control has a spoken name', () => {
  it('on Home, with apps, notices and a warning', () => {
    (useHomeViewModel as jest.Mock).mockReturnValue({
      blockedApps: [
        {
          packageName: 'a',
          appName: 'Instagram',
          limitMinutes: 5,
          cooldownMinutes: 10,
          dailyLimitMinutes: 60,
          isActive: true,
        },
      ],
      goalsSummary: { done: 1, total: 3, label: '' },
      handleOpenGoals: noop,
      trackerEnabled: true,
      monitorHealth: {
        tone: 'warning',
        headline: 'Monitoring needs attention',
        details: ['Notifications are blocked.'],
        opensSettings: true,
      },
      interruptionNote: 'You swiped Recess away.',
      oemGuidance: { title: 'Keep Recess running', steps: 'Open Settings.' },
      handleDismissInterruption: noop,
      handleDismissOemGuidance: noop,
      handleOpenAppSettings: noop,
      trackerBusy: false,
      shouldShowPermissionBanner: true,
      permissionBannerText: 'Grant Usage Access permission to enable tracking',
      handleToggleTracker: noop,
      handleToggleApp: noop,
      handleRemoveApp: noop,
      handleRequestPermission: noop,
      handleAddApp: noop,
    });
    render(<HomeScreen />);

    expect(expectEveryControlNamed()).toBeGreaterThan(8);
  });

  it('on the Goals screen, with quests and the quotes switch on', () => {
    (useGoalsViewModel as jest.Mock).mockReturnValue({
      goals: [{ id: 'a', title: 'Read', done: false, createdAt: 1 }],
      draft: '',
      error: null,
      summary: { done: 0, total: 1, label: '' },
      canAdd: false,
      onlineQuotes: true,
      onlineQuotesLoaded: true,
      handleToggleOnlineQuotes: noop,
      handleOpenAttribution: noop,
      handleBack: noop,
      handleChangeDraft: noop,
      handleAdd: noop,
      handleToggle: noop,
      handleRemove: noop,
    });
    render(<GoalsScreen />);

    expect(expectEveryControlNamed()).toBeGreaterThan(4);
  });

  it('on the Break screen', () => {
    (useBreakViewModel as jest.Mock).mockReturnValue({
      status: 'active',
      event: {
        appName: 'Instagram',
        quote: { text: 'Be here now.', author: 'Someone' },
      },
      goals: [{ id: 'a', title: 'Read', done: false, createdAt: 1 }],
      isDaily: false,
      headline: 'Time’s up',
      detail: 'Instagram is on timeout.',
      countdownText: '1:30',
      handleToggleGoal: noop,
      handleDone: noop,
    });
    render(<BreakScreen />);

    expect(expectEveryControlNamed()).toBeGreaterThan(1);
  });

  it('on the app picker', () => {
    render(
      <AppPicker
        apps={[{ packageName: 'a', appName: 'Instagram' }]}
        search=""
        loading={false}
        onSearch={noop}
        onSelect={noop}
        onClose={noop}
      />,
    );

    expect(expectEveryControlNamed()).toBeGreaterThan(1);
  });

  it('on the limits step', () => {
    render(
      <AppConfig
        app={{ packageName: 'a', appName: 'Instagram' }}
        limitMinutes={10}
        cooldownMinutes={10}
        dailyLimitMinutes={60}
        error={null}
        canSave
        saving={false}
        presetLimits={[5, 10]}
        presetCooldowns={[5, 10]}
        presetDailyLimits={[30, 60]}
        onLimit={noop}
        onCooldown={noop}
        onDaily={noop}
        onSave={noop}
        onBack={noop}
      />,
    );

    expect(expectEveryControlNamed()).toBeGreaterThan(8);
  });
});
