import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  palette,
  radius,
  space,
  typography,
} from '../../../shared/theme/tokens';
import { Card, CardTone } from '../../../shared/ui/card';
import { PressableScale } from '../../../shared/ui/pressable-scale';

export interface NoticeAction {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
}

interface NoticeCardProps {
  title?: string;
  body: string;
  actions?: NoticeAction[];
  tone?: CardTone;
}

/** A heads-up card: something to read and, maybe, one or two things to tap. */
export function NoticeCard({
  title,
  body,
  actions = [],
  tone = 'warning',
}: NoticeCardProps) {
  return (
    <Card tone={tone} style={styles.card}>
      {title !== undefined && <Text style={styles.title}>{title}</Text>}
      <Text style={styles.body}>{body}</Text>
      {actions.length > 0 && (
        <View style={styles.actions}>
          {actions.map((action) => (
            <PressableScale
              key={action.accessibilityLabel}
              accessibilityLabel={action.accessibilityLabel}
              onPress={action.onPress}
              style={styles.action}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </PressableScale>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  title: { ...typography.heading, color: palette.textPrimary },
  body: { ...typography.body, lineHeight: 21, color: palette.textPrimary },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginTop: space.xs,
  },
  action: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: palette.warning,
  },
  actionText: { ...typography.label, color: palette.warning },
});
