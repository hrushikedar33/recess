import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { copy } from '../../../shared/copy';
import { palette, space, typography } from '../../../shared/theme/tokens';
import { Card } from '../../../shared/ui/card';
import { PressableScale } from '../../../shared/ui/pressable-scale';
import { Toggle } from '../../../shared/ui/toggle';

interface QuotesCardProps {
  enabled: boolean;
  /** False until the saved setting has been read, so a tap cannot race it. */
  loaded: boolean;
  onToggle: (next: boolean) => void;
  onOpenAttribution: () => void;
}

/** The opt-in for fresh quotes from the internet, in plain words about what it does. */
export function QuotesCard({
  enabled,
  loaded,
  onToggle,
  onOpenAttribution,
}: QuotesCardProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text style={styles.title}>{copy.goals.quotes.title}</Text>
          <Text style={styles.body}>{copy.goals.quotes.plain.body}</Text>
        </View>
        <Toggle
          value={enabled}
          disabled={!loaded}
          onValueChange={onToggle}
          accessibilityLabel={copy.goals.quotes.switchLabel}
        />
      </View>
      {enabled && (
        <PressableScale
          accessibilityRole="link"
          accessibilityLabel={copy.goals.quotes.attribution}
          onPress={onOpenAttribution}
          style={styles.link}
        >
          <Text style={styles.linkText}>{copy.goals.quotes.attribution}</Text>
        </PressableScale>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.md, marginTop: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  texts: { flex: 1, gap: space.xs },
  title: { ...typography.heading, color: palette.textPrimary },
  body: { ...typography.caption, lineHeight: 18, color: palette.textSecondary },
  link: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  linkText: {
    ...typography.caption,
    color: palette.primary,
    textDecorationLine: 'underline',
  },
});
