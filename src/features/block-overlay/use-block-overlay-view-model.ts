import { useEffect, useState } from 'react';
import { Animated, BackHandler } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Routes } from '../../app/navigation/routes';
import { RootStackParamList } from '../../app/navigation/types';
import { formatDuration } from '../../core/utils/time.utils';

type NavProp = StackNavigationProp<RootStackParamList>;
type BlockRoute = RouteProp<RootStackParamList, Routes.BlockOverlay>;

const TIPS = [
  'Stand up and stretch for 2 minutes.',
  'Take 5 deep breaths. Inhale for 4, exhale for 6.',
  'Drink a glass of water.',
  'Look at something 20 feet away for 20 seconds.',
  'Do 10 jumping jacks.',
  "Write down one thing you're grateful for.",
  'Step outside and get some fresh air.',
  'Text someone you care about.',
];

export function useBlockOverlayViewModel() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<BlockRoute>();
  const {
    appName,
    limitMinutes,
    cooldownMinutes,
    usageMinutes,
    remainingCooldownSeconds,
  } = route.params;

  const initialCountdown =
    typeof remainingCooldownSeconds === 'number' && remainingCooldownSeconds > 0
      ? remainingCooldownSeconds
      : cooldownMinutes * 60;

  const [countdown, setCountdown] = useState(initialCountdown);
  const [tip] = useState(() => TIPS[Math.floor(Math.random() * TIPS.length)]);

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(0.9));
  const [pulseAnim] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );

    const timer = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }

        return previous - 1;
      });
    }, 1000);

    return () => {
      backHandler.remove();
      clearInterval(timer);
      pulse.stop();
    };
  }, [fadeAnim, pulseAnim, scaleAnim]);

  const handleDone = () => {
    navigation.goBack();
  };

  const canLeave = countdown === 0;

  return {
    appName,
    limitMinutes,
    usageMinutes,
    cooldownMinutes,
    countdown,
    countdownText: formatDuration(countdown),
    tip,
    fadeAnim,
    scaleAnim,
    pulseAnim,
    canLeave,
    handleDone,
    overLimitMinutes: usageMinutes - limitMinutes,
  };
}
