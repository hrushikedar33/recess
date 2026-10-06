import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { AppConfig } from '@features/add-app/components/app-config';
import { AppPicker } from '@features/add-app/components/app-picker';
import { ChipGroup } from '@features/add-app/components/chip-group';
import { copy } from '@shared/copy';

const info = AccessibilityInfo as unknown as {
  isReduceMotionEnabled: jest.Mock;
  addEventListener: jest.Mock;
};

beforeEach(() => {
  info.isReduceMotionEnabled.mockResolvedValue(true);
  info.addEventListener.mockReturnValue({ remove: jest.fn() });
});

describe('ChipGroup', () => {
  const options = [
    { value: 5, label: '5m', spoken: '5 minutes' },
    { value: 10, label: '10m', spoken: '10 minutes' },
  ];

  it('is a single-choice group with a name, showing which one is chosen', () => {
    render(
      <ChipGroup
        title="How long per sesh"
        options={options}
        selected={10}
        onSelect={jest.fn()}
        description="Time's up after 10 minutes in one go."
      />,
    );

    // A group is not one focusable element (its chips are), so it is found by its label.
    expect(
      screen.getByLabelText('How long per sesh').props.accessibilityRole,
    ).toBe('radiogroup');
    expect(
      screen.getByRole('radio', { name: '10 minutes' }).props
        .accessibilityState,
    ).toMatchObject({ selected: true });
    expect(
      screen.getByRole('radio', { name: '5 minutes' }).props.accessibilityState,
    ).toMatchObject({ selected: false });
    expect(
      screen.getByText("Time's up after 10 minutes in one go."),
    ).toBeTruthy();
  });

  it('picks the one that is pressed', () => {
    const onSelect = jest.fn();
    render(
      <ChipGroup
        title="t"
        options={options}
        selected={10}
        onSelect={onSelect}
        description="d"
      />,
    );

    fireEvent.press(screen.getByRole('radio', { name: '5 minutes' }));

    expect(onSelect).toHaveBeenCalledWith(5);
  });

  it('can include an option that means "none"', () => {
    const onSelect = jest.fn();
    render(
      <ChipGroup
        title="t"
        options={[
          ...options,
          { value: null, label: 'No cap', spoken: 'No daily budget' },
        ]}
        selected={null}
        onSelect={onSelect}
        description="d"
      />,
    );

    expect(
      screen.getByRole('radio', { name: 'No daily budget' }).props
        .accessibilityState,
    ).toMatchObject({ selected: true });

    fireEvent.press(screen.getByRole('radio', { name: '5 minutes' }));
    expect(onSelect).toHaveBeenCalledWith(5);
  });
});

describe('AppPicker', () => {
  const apps = [
    { packageName: 'com.instagram.android', appName: 'Instagram' },
    { packageName: 'com.google.android.youtube', appName: 'YouTube' },
  ];
  const picker = (
    props: Partial<React.ComponentProps<typeof AppPicker>> = {},
  ) => (
    <AppPicker
      apps={apps}
      search=""
      loading={false}
      onSearch={jest.fn()}
      onSelect={jest.fn()}
      onClose={jest.fn()}
      {...props}
    />
  );

  it('has the heading, a way back and a search box', () => {
    const onClose = jest.fn();
    render(picker({ onClose }));

    expect(
      screen.getByRole('header', { name: copy.addApp.pickTitle }),
    ).toBeTruthy();
    expect(screen.getByLabelText(copy.addApp.searchA11y)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lists the apps and picks one', () => {
    const onSelect = jest.fn();
    render(picker({ onSelect }));

    fireEvent.press(
      screen.getByRole('button', { name: copy.addApp.rowA11y('YouTube') }),
    );

    expect(onSelect).toHaveBeenCalledWith(apps[1]);
  });

  it('passes what you type to the search', () => {
    const onSearch = jest.fn();
    render(picker({ onSearch }));

    fireEvent.changeText(
      screen.getByLabelText(copy.addApp.searchA11y),
      'insta',
    );

    expect(onSearch).toHaveBeenCalledWith('insta');
  });

  it('says it is busy while the apps load, and shows no rows yet', () => {
    render(picker({ loading: true, apps: [] }));

    expect(screen.getByLabelText(copy.addApp.loading)).toBeTruthy();
    expect(screen.queryByText('Instagram')).toBeNull();
  });

  it('says so when nothing matches the search', () => {
    render(picker({ apps: [], search: 'zzz' }));

    expect(screen.getByText(copy.addApp.noMatch('zzz'))).toBeTruthy();
  });
});

describe('AppConfig', () => {
  const base = {
    app: { packageName: 'com.instagram.android', appName: 'Instagram' },
    limitMinutes: 10,
    cooldownMinutes: 10,
    dailyLimitMinutes: 60 as number | null,
    error: null as string | null,
    canSave: true,
    saving: false,
    presetLimits: [5, 10, 15],
    presetCooldowns: [5, 10],
    presetDailyLimits: [30, 60],
    onLimit: jest.fn(),
    onCooldown: jest.fn(),
    onDaily: jest.fn(),
    onSave: jest.fn(),
    onBack: jest.fn(),
  };

  it('names the app and gives each choice its own group', () => {
    render(<AppConfig {...base} />);

    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(
      screen.getByLabelText(copy.addApp.session.title).props.accessibilityRole,
    ).toBe('radiogroup');
    expect(
      screen.getByLabelText(copy.addApp.cooldown.title).props.accessibilityRole,
    ).toBe('radiogroup');
    expect(
      screen.getByLabelText(copy.addApp.daily.title).props.accessibilityRole,
    ).toBe('radiogroup');
  });

  it('shows the chosen values in a live summary', () => {
    render(
      <AppConfig
        {...base}
        limitMinutes={15}
        cooldownMinutes={5}
        dailyLimitMinutes={null}
      />,
    );

    expect(screen.getByText(copy.addApp.summary(15, 5, null))).toBeTruthy();
  });

  it('sets the session, break and daily choices', () => {
    const onLimit = jest.fn();
    const onCooldown = jest.fn();
    const onDaily = jest.fn();
    render(
      <AppConfig
        {...base}
        onLimit={onLimit}
        onCooldown={onCooldown}
        onDaily={onDaily}
      />,
    );

    const inGroup = (title: string) => within(screen.getByLabelText(title));

    fireEvent.press(
      inGroup(copy.addApp.session.title).getByRole('radio', {
        name: copy.addApp.minutesA11y(15),
      }),
    );
    expect(onLimit).toHaveBeenCalledWith(15);

    fireEvent.press(
      inGroup(copy.addApp.cooldown.title).getByRole('radio', {
        name: copy.addApp.minutesA11y(5),
      }),
    );
    expect(onCooldown).toHaveBeenCalledWith(5);

    fireEvent.press(
      screen.getByRole('radio', { name: copy.addApp.daily.noCapA11y }),
    );
    expect(onDaily).toHaveBeenCalledWith(null);
  });

  it('shows a problem as an alert and will not save', () => {
    const onSave = jest.fn();
    render(
      <AppConfig
        {...base}
        error="The daily budget must be at least as long as one session."
        canSave={false}
        onSave={onSave}
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();

    const save = screen.getByRole('button', { name: copy.addApp.saveA11y });
    fireEvent.press(save);

    expect(onSave).not.toHaveBeenCalled();
    expect(save.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it('saves when it can', () => {
    const onSave = jest.fn();
    render(<AppConfig {...base} onSave={onSave} />);

    fireEvent.press(screen.getByRole('button', { name: copy.addApp.saveA11y }));

    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('says it is saving, and cannot be pressed again', () => {
    const onSave = jest.fn();
    render(<AppConfig {...base} saving canSave={false} onSave={onSave} />);

    expect(screen.getByText(copy.addApp.saving)).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: copy.addApp.saveA11y }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('goes back to the app list', () => {
    const onBack = jest.fn();
    render(<AppConfig {...base} onBack={onBack} />);

    fireEvent.press(screen.getByRole('button', { name: 'Go back' }));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
