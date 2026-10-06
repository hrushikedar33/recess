import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import HomeScreen from '@features/home/home-screen';
import { useHomeViewModel } from '@features/home/use-home-view-model';
import { copy } from '@shared/copy';

jest.mock('@features/home/use-home-view-model');
jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return { SafeAreaView: View };
});

const mockUseHomeViewModel = useHomeViewModel as jest.Mock;

const app = (name: string, isActive = true) => ({
  packageName: `com.example.${name.toLowerCase()}`,
  appName: name,
  limitMinutes: 5,
  cooldownMinutes: 10,
  dailyLimitMinutes: 60,
  isActive,
});

const vm = (overrides: Record<string, unknown> = {}) => ({
  blockedApps: [],
  goalsSummary: { done: 0, total: 0, label: '' },
  handleOpenGoals: jest.fn(),
  trackerEnabled: false,
  monitorHealth: {
    tone: 'off',
    headline: 'Monitoring is off',
    details: [],
    opensSettings: false,
  },
  interruptionNote: null,
  oemGuidance: null,
  handleDismissInterruption: jest.fn(),
  handleDismissOemGuidance: jest.fn(),
  handleOpenAppSettings: jest.fn(),
  trackerBusy: false,
  shouldShowPermissionBanner: false,
  permissionBannerText: '',
  handleToggleTracker: jest.fn(),
  handleToggleApp: jest.fn(),
  handleRemoveApp: jest.fn(),
  handleRequestPermission: jest.fn(),
  handleAddApp: jest.fn(),
  ...overrides,
});

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

beforeEach(() => {
  info.isReduceMotionEnabled.mockResolvedValue(true);
  info.addEventListener.mockReturnValue({ remove: jest.fn() });
  mockUseHomeViewModel.mockReturnValue(vm());
});

describe('HomeScreen', () => {
  it('opens with the name, the tagline and the way to add an app', () => {
    render(<HomeScreen />);

    expect(screen.getByRole('header', { name: copy.home.title })).toBeTruthy();
    expect(screen.getByText(copy.home.tagline)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: copy.home.addA11y }),
    ).toBeTruthy();
  });

  it('shows the friendly empty state when no app is limited yet', () => {
    render(<HomeScreen />);

    expect(screen.getByText(copy.home.empty.title)).toBeTruthy();
    expect(screen.queryByText(copy.home.apps.title)).toBeNull();
  });

  it('lists each limited app under "on the clock", with no empty state', () => {
    mockUseHomeViewModel.mockReturnValue(
      vm({ blockedApps: [app('Instagram'), app('YouTube', false)] }),
    );
    render(<HomeScreen />);

    expect(screen.getByText(copy.home.apps.title)).toBeTruthy();
    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('YouTube')).toBeTruthy();
    expect(screen.queryByText(copy.home.empty.title)).toBeNull();
  });

  it('switches one app on or off', () => {
    const handleToggleApp = jest.fn();
    mockUseHomeViewModel.mockReturnValue(
      vm({ blockedApps: [app('Instagram')], handleToggleApp }),
    );
    render(<HomeScreen />);

    fireEvent.press(
      screen.getByRole('switch', { name: copy.home.appSwitch('Instagram') }),
    );

    expect(handleToggleApp).toHaveBeenCalledWith('com.example.instagram');
  });

  it('removes an app through the view model, which asks first', () => {
    const handleRemoveApp = jest.fn();
    const instagram = app('Instagram');
    mockUseHomeViewModel.mockReturnValue(
      vm({ blockedApps: [instagram], handleRemoveApp }),
    );
    render(<HomeScreen />);

    fireEvent.press(
      screen.getByRole('button', { name: copy.home.remove('Instagram') }),
    );

    expect(handleRemoveApp).toHaveBeenCalledWith(instagram);
  });

  it('turns monitoring on and off from the big card', () => {
    const handleToggleTracker = jest.fn();
    mockUseHomeViewModel.mockReturnValue(vm({ handleToggleTracker }));
    render(<HomeScreen />);

    fireEvent.press(
      screen.getByRole('switch', { name: copy.home.switchLabel }),
    );

    expect(handleToggleTracker).toHaveBeenCalledTimes(1);
  });

  it('counts only the apps that are switched on in the status card', () => {
    mockUseHomeViewModel.mockReturnValue(
      vm({
        trackerEnabled: true,
        blockedApps: [app('Instagram'), app('YouTube', false)],
      }),
    );
    render(<HomeScreen />);

    expect(screen.getByText(copy.home.on.detail(1))).toBeTruthy();
  });

  it('shows the quests card with progress and opens the goals screen', () => {
    const handleOpenGoals = jest.fn();
    mockUseHomeViewModel.mockReturnValue(
      vm({ goalsSummary: { done: 1, total: 4, label: '' }, handleOpenGoals }),
    );
    render(<HomeScreen />);

    expect(screen.getByText(copy.home.goals.progress(1, 4))).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', {
        name: copy.home.goals.a11y(copy.home.goals.progress(1, 4)),
      }),
    );

    expect(handleOpenGoals).toHaveBeenCalledTimes(1);
  });

  it('goes to the add-app screen from the button', () => {
    const handleAddApp = jest.fn();
    mockUseHomeViewModel.mockReturnValue(vm({ handleAddApp }));
    render(<HomeScreen />);

    fireEvent.press(screen.getByRole('button', { name: copy.home.addA11y }));

    expect(handleAddApp).toHaveBeenCalledTimes(1);
  });

  it('tells you when monitoring was interrupted, and lets you dismiss it', () => {
    const handleDismissInterruption = jest.fn();
    mockUseHomeViewModel.mockReturnValue(
      vm({
        interruptionNote:
          'You swiped Recess away, so it had to restart itself.',
        handleDismissInterruption,
      }),
    );
    render(<HomeScreen />);

    expect(
      screen.getByText('You swiped Recess away, so it had to restart itself.'),
    ).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', { name: copy.home.dismissNote }),
    );

    expect(handleDismissInterruption).toHaveBeenCalledTimes(1);
  });

  it('shows the keep-alive guidance for phones that need it, with both actions', () => {
    const handleOpenAppSettings = jest.fn();
    const handleDismissOemGuidance = jest.fn();
    mockUseHomeViewModel.mockReturnValue(
      vm({
        oemGuidance: {
          title: 'Keep Recess running on your phone',
          steps: 'Open Settings, then Battery.',
        },
        handleOpenAppSettings,
        handleDismissOemGuidance,
      }),
    );
    render(<HomeScreen />);

    expect(screen.getByText('Keep Recess running on your phone')).toBeTruthy();
    expect(screen.getByText('Open Settings, then Battery.')).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', { name: copy.home.settingsA11y }),
    );
    fireEvent.press(
      screen.getByRole('button', { name: copy.home.dismissGuidance }),
    );

    expect(handleOpenAppSettings).toHaveBeenCalledTimes(1);
    expect(handleDismissOemGuidance).toHaveBeenCalledTimes(1);
  });

  it('shows the permission banner and lets you fix it', () => {
    const handleRequestPermission = jest.fn();
    mockUseHomeViewModel.mockReturnValue(
      vm({
        shouldShowPermissionBanner: true,
        permissionBannerText:
          'Grant Usage Access permission to enable tracking',
        handleRequestPermission,
      }),
    );
    render(<HomeScreen />);

    expect(
      screen.getByText('Grant Usage Access permission to enable tracking'),
    ).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', {
        name: 'Grant Usage Access permission to enable tracking',
      }),
    );

    expect(handleRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('shows what needs attention when monitoring has a problem', () => {
    mockUseHomeViewModel.mockReturnValue(
      vm({
        trackerEnabled: true,
        monitorHealth: {
          tone: 'warning',
          headline: 'Monitoring needs attention',
          details: [
            'Usage access is off, so Recess cannot see which app is open.',
          ],
          opensSettings: false,
        },
      }),
    );
    render(<HomeScreen />);

    expect(screen.getByText('Monitoring needs attention')).toBeTruthy();
    expect(
      screen.getByText(
        'Usage access is off, so Recess cannot see which app is open.',
      ),
    ).toBeTruthy();
  });
});
