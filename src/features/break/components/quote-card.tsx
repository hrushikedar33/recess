import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { copy } from '../../../shared/copy';
import { useEntrance } from '../../../shared/motion/use-entrance';
import { palette, space, typography } from '../../../shared/theme/tokens';
import { Card } from '../../../shared/ui/card';

interface QuoteCardProps {
  text: string;
  author: string;
}

export function QuoteCard({ text, author }: QuoteCardProps) {
  const entrance = useEntrance(120, 20);

  return (
    <Animated.View style={entrance}>
      <Card style={styles.card}>
        <Text style={styles.quote}>{`“${text}”`}</Text>
        <Text style={styles.author}>{copy.break.quoteAuthor(author)}</Text>
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: space.xl,
    gap: space.md,
  },
  quote: {
    ...typography.heading,
    fontSize: 21,
    lineHeight: 30,
    fontStyle: 'italic',
    color: palette.textPrimary,
  },
  author: {
    ...typography.label,
    color: palette.textSecondary,
  },
});
