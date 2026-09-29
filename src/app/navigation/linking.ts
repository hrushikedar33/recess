import { LinkingOptions } from '@react-navigation/native';
import { Routes } from './routes';
import { RootStackParamList } from './types';

export const BREAK_URL = 'recess://break';

/**
 * `recess://break` opens the Break screen (the monitor uses it for the notification and the
 * takeover). Only that exact URL is accepted, and the filter runs before the URL is parsed:
 * a link with a query string, fragment or extra path is dropped without being decoded, so a
 * hostile link cannot feed the parser anything. The screen reads the last break from storage
 * and takes no parameters, so an accepted link can only ever show it, read-only.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['recess://'],
  filter: (url) => url === BREAK_URL,
  config: {
    screens: {
      [Routes.Break]: 'break',
    },
  },
};
