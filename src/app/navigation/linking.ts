import { LinkingOptions } from '@react-navigation/native';
import { Routes } from './routes';
import { RootStackParamList } from './types';

/**
 * `recess://break` opens the Break screen (the monitor uses it for the notification and the
 * takeover). It takes no parameters and the screen ignores any it is given, so a link from
 * anywhere else can only ever show the last break, read-only.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['recess://'],
  config: {
    screens: {
      [Routes.Break]: 'break',
    },
  },
};
