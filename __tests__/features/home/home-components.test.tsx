import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { AppCard } from '@features/home/components/app-card';
import { EmptyApps } from '@features/home/components/empty-apps';
import { GoalsCard } from '@features/home/components/goals-card';
import { HealthStrip } from '@features/home/components/health-strip';
import { NoticeCard } from '@features/home/components/notice-card';
import { StatusCard } from '@features/home/components/status-card';
import { copy } from '@shared/copy';
import * as haptics from '@shared/motion/haptics';

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

beforeEach(() => {
  info.isReduceMotionEnabled.mockResolvedValue(true);
  info.addEventListener.mockReturnValue({ remove: jest.fn() });
  jest.spyOn(haptics, 'tick').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('StatusCard', () => {
  it('is one switch for monitoring, and says when it is on', () => {
    render(
      <StatusCard enabled busy={false} activeCount={2} onToggle={jest.fn()} />,
    );

    const toggle = screen.getByRole('switch', { name: copy.home.switchLabel });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(copy.home.on.title)).toBeTruthy();
    expect(screen.getByText(copy.home.on.detail(2))).toBeTruthy();
  });

  it('says when it is off, and how to turn it on', () => {
    render(
      <StatusCard
        enabled={false}
        busy={false}
        activeCount={0}
        onToggle={jest.fn()}
      />,
    );

    expect(
      screen.getByRole('switch', { name: copy.home.switchLabel }).props
        .accessibilityState,
    ).toMatchObject({ checked: false });
    expect(screen.getByText(copy.home.off.title)).toBeTruthy();
    expect(screen.getByText(copy.home.off.detail)).toBeTruthy();
  });

  it('asks to toggle when pressed, with a tick', () => {
    const onToggle = jest.fn();
    render(
      <StatusCard
        enabled={false}
        busy={false}
        activeCount={0}
        onToggle={onToggle}
      />,
    );

    fireEvent.press(
      screen.getByRole('switch', { name: copy.home.switchLabel }),
    );

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(haptics.tick).toHaveBeenCalledTimes(1);
  });

  it('cannot be pressed while it is busy, and says so', () => {
    const onToggle = jest.fn();
    render(<StatusCard enabled busy activeCount={1} onToggle={onToggle} />);

    fireEvent.press(
      screen.getByRole('switch', { name: copy.home.switchLabel }),
    );

    expect(onToggle).not.toHaveBeenCalled();
    expect(screen.getByText(copy.home.busy)).toBeTruthy();
  });

  it('tells you to add an app when it is on with nothing to watch', () => {
    render(
      <StatusCard enabled busy={false} activeCount={0} onToggle={jest.fn()} />,
    );

    expect(screen.getByText(copy.home.on.detail(0))).toBeTruthy();
  });
});

describe('HealthStrip', () => {
  it('shows nothing while monitoring is off', () => {
    render(
      <HealthStrip
        health={{
          tone: 'off',
          headline: 'Monitoring is off',
          details: [],
          opensSettings: false,
        }}
        onOpenSettings={jest.fn()}
      />,
    );

    expect(screen.queryByText('Monitoring is off')).toBeNull();
  });

  it('is a quiet one-liner when all is well', () => {
    render(
      <HealthStrip
        health={{
          tone: 'ok',
          headline: 'Monitoring is active',
          details: ['Last checked 20s ago'],
          opensSettings: false,
        }}
        onOpenSettings={jest.fn()}
      />,
    );

    expect(screen.getByText('Monitoring is active')).toBeTruthy();
    expect(screen.getByText('· Last checked 20s ago')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('lists every problem and offers settings when the user can fix it there', () => {
    const onOpenSettings = jest.fn();
    render(
      <HealthStrip
        health={{
          tone: 'warning',
          headline: 'Monitoring needs attention',
          details: [
            'Notifications are blocked.',
            'Battery optimization is on.',
          ],
          opensSettings: true,
        }}
        onOpenSettings={onOpenSettings}
      />,
    );

    expect(screen.getByText('Notifications are blocked.')).toBeTruthy();
    expect(screen.getByText('Battery optimization is on.')).toBeTruthy();

    fireEvent.press(
      screen.getByRole('button', { name: copy.home.settingsA11y }),
    );

    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it('does not offer settings for a problem settings cannot fix', () => {
    render(
      <HealthStrip
        health={{
          tone: 'warning',
          headline: 'Monitoring needs attention',
          details: ['Usage access is off.'],
          opensSettings: false,
        }}
        onOpenSettings={jest.fn()}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('NoticeCard', () => {
  it('shows its words and runs its actions', () => {
    const onPress = jest.fn();
    render(
      <NoticeCard
        title="Keep Recess running"
        body="Open Settings, then Battery."
        actions={[
          { label: 'Got it', accessibilityLabel: 'Dismiss this note', onPress },
        ]}
      />,
    );

    expect(screen.getByText('Keep Recess running')).toBeTruthy();
    expect(screen.getByText('Open Settings, then Battery.')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Dismiss this note' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('works without a title or actions', () => {
    render(<NoticeCard body="Heads up." />);

    expect(screen.getByText('Heads up.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('GoalsCard', () => {
  it('invites you to add the first quest when there are none', () => {
    render(<GoalsCard done={0} total={0} onPress={jest.fn()} />);

    expect(screen.getByText(copy.home.goals.empty)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('shows how many are done, with a bar', () => {
    render(<GoalsCard done={2} total={5} onPress={jest.fn()} />);

    expect(screen.getByText(copy.home.goals.progress(2, 5))).toBeTruthy();
    expect(screen.getByRole('progressbar').props.accessibilityValue.now).toBe(
      40,
    );
  });

  it('celebrates when everything is done', () => {
    render(<GoalsCard done={3} total={3} onPress={jest.fn()} />);

    expect(screen.getByText(copy.home.goals.allDone)).toBeTruthy();
  });

  it('opens the goals screen when pressed, named for a screen reader', () => {
    const onPress = jest.fn();
    render(<GoalsCard done={2} total={5} onPress={onPress} />);

    fireEvent.press(
      screen.getByRole('button', {
        name: copy.home.goals.a11y(copy.home.goals.progress(2, 5)),
      }),
    );

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('AppCard', () => {
  const app = {
    packageName: 'com.instagram.android',
    appName: 'Instagram',
    limitMinutes: 5,
    cooldownMinutes: 10,
    dailyLimitMinutes: 60,
    isActive: true,
  };

  it('shows the app and its three limits as tags', () => {
    render(
      <AppCard app={app} index={0} onToggle={jest.fn()} onRemove={jest.fn()} />,
    );

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByText('5 min/sesh')).toBeTruthy();
    expect(screen.getByText('10 min break')).toBeTruthy();
    expect(screen.getByText('60 min/day')).toBeTruthy();
  });

  it('says "no cap" when there is no daily budget', () => {
    render(
      <AppCard
        app={{ ...app, dailyLimitMinutes: undefined }}
        index={0}
        onToggle={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    expect(screen.getByText('no cap')).toBeTruthy();
  });

  it('has a switch for this app that reports its state and toggles it', () => {
    const onToggle = jest.fn();
    render(
      <AppCard app={app} index={0} onToggle={onToggle} onRemove={jest.fn()} />,
    );

    const toggle = screen.getByRole('switch', {
      name: copy.home.appSwitch('Instagram'),
    });
    expect(toggle.props.accessibilityState).toMatchObject({ checked: true });

    fireEvent.press(toggle);

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('has a clearly named remove button', () => {
    const onRemove = jest.fn();
    render(
      <AppCard app={app} index={0} onToggle={jest.fn()} onRemove={onRemove} />,
    );

    fireEvent.press(
      screen.getByRole('button', { name: copy.home.remove('Instagram') }),
    );

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('falls back to the first letter when the app has no icon', () => {
    render(
      <AppCard app={app} index={0} onToggle={jest.fn()} onRemove={jest.fn()} />,
    );

    expect(screen.getByText('I')).toBeTruthy();
  });
});

describe('EmptyApps', () => {
  it('says what to do', () => {
    render(<EmptyApps />);

    expect(screen.getByText(copy.home.empty.title)).toBeTruthy();
    expect(screen.getByText(copy.home.empty.body)).toBeTruthy();
  });
});
