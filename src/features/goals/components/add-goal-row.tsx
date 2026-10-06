import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { MAX_GOAL_TITLE_LENGTH } from '../../../core/constants/app.constants';
import { copy } from '../../../shared/copy';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { PressableScale } from '../../../shared/ui/pressable-scale';

interface AddGoalRowProps {
  draft: string;
  canAdd: boolean;
  onChange: (text: string) => void;
  onSubmit: () => void;
}

/** The text box and its Add button. The box lights up while you type in it. */
export function AddGoalRow({
  draft,
  canAdd,
  onChange,
  onSubmit,
}: AddGoalRowProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.row}>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        value={draft}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={copy.goals.placeholder}
        placeholderTextColor={palette.textDisabled}
        maxLength={MAX_GOAL_TITLE_LENGTH}
        returnKeyType="done"
        accessibilityLabel={copy.goals.inputA11y}
      />
      <PressableScale
        accessibilityLabel={copy.goals.addA11y}
        disabled={!canAdd}
        onPress={onSubmit}
        style={[styles.button, !canAdd && styles.buttonOff]}
      >
        <Text style={[styles.buttonText, !canAdd && styles.buttonTextOff]}>
          {copy.goals.add}
        </Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  input: {
    flex: 1,
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: space.lg,
    color: palette.textPrimary,
    fontSize: 16,
  },
  inputFocused: { borderColor: palette.primary },
  button: {
    minHeight: 52,
    minWidth: 76,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  buttonOff: { backgroundColor: palette.raised },
  buttonText: { ...typography.heading, fontSize: 16, color: palette.onPrimary },
  buttonTextOff: { color: palette.textDisabled },
});
