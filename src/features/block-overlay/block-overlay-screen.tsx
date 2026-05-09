import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBlockOverlayViewModel } from './use-block-overlay-view-model';

export default function BlockOverlayScreen() {
  const {
    appName,
    limitMinutes,
    usageMinutes,
    countdownText,
    tip,
    fadeAnim,
    scaleAnim,
    pulseAnim,
    canLeave,
    handleDone,
    overLimitMinutes,
  } = useBlockOverlayViewModel();

  return (
    <View style={styles.fullscreen}>
      <SafeAreaView style={styles.container}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconRing}>
            <Text style={styles.iconEmoji}>⏸</Text>
          </View>

          {/* Headline */}
          <Text style={styles.title}>Time to pause</Text>
          <Text style={styles.subtitle}>
            You've used <Text style={styles.highlight}>{appName}</Text> for{' '}
            <Text style={styles.highlight}>{usageMinutes} minutes</Text> today.
          </Text>

          {/* Countdown */}
          <Animated.View
            style={[styles.timerCircle, { transform: [{ scale: pulseAnim }] }]}
          >
            {canLeave ? (
              <Text style={styles.timerDone}>✓</Text>
            ) : (
              <>
                <Text style={styles.timerValue}>{countdownText}</Text>
                <Text style={styles.timerLabel}>cooldown</Text>
              </>
            )}
          </Animated.View>

          {/* Tip Card */}
          <View style={styles.tipCard}>
            <Text style={styles.tipHeader}>While you wait →</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{limitMinutes}m</Text>
              <Text style={styles.statLabel}>Daily limit</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValue}>{usageMinutes}m</Text>
              <Text style={styles.statLabel}>Used today</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <Text style={styles.statValueAccent}>+{overLimitMinutes}m</Text>
              <Text style={styles.statLabel}>Over limit</Text>
            </View>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[styles.doneBtn, !canLeave && styles.doneBtnDisabled]}
            onPress={handleDone}
            disabled={!canLeave}
          >
            <Text
              style={[
                styles.doneBtnText,
                !canLeave && styles.doneBtnTextDisabled,
              ]}
            >
              {canLeave ? "I'm done for now" : `Wait ${countdownText}`}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fullscreen: {
    flex: 1,
    backgroundColor: '#050505',
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 20,
  },
  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF47571a',
    borderWidth: 1.5,
    borderColor: '#FF475750',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  highlight: {
    color: '#FF4757',
    fontWeight: '600',
  },
  timerCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: '#FF475730',
    backgroundColor: '#FF47570d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FF4757',
    letterSpacing: -1,
  },
  timerLabel: {
    fontSize: 11,
    color: '#FF475780',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  timerDone: {
    fontSize: 48,
    color: '#4CAF50',
  },
  tipCard: {
    width: '100%',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  tipHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  statsRow: {
    width: '100%',
    flexDirection: 'row',
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e1e1e',
    alignItems: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  statValueAccent: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF4757',
  },
  statLabel: {
    fontSize: 11,
    color: '#555',
    marginTop: 3,
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#1e1e1e',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: '#FF4757',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  doneBtnDisabled: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#222',
  },
  doneBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  doneBtnTextDisabled: {
    color: '#444',
  },
});
