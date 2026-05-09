import { Platform } from 'react-native';
import { AppInfo } from '../../core/types/domain.types';
import { AppListAdapter } from '../local/native/app-list-adapter';
import { IInstalledAppsRepository } from './i-installed-apps-repository';

const IOS_DEV_MOCK_APPS: AppInfo[] = [
  { packageName: 'com.instagram.android', appName: 'Instagram' },
  { packageName: 'com.twitter.android', appName: 'Twitter / X' },
  { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok' },
  { packageName: 'com.snapchat.android', appName: 'Snapchat' },
  { packageName: 'com.facebook.katana', appName: 'Facebook' },
  { packageName: 'com.reddit.frontpage', appName: 'Reddit' },
  { packageName: 'com.youtube.android', appName: 'YouTube' },
];

export class InstalledAppsRepository implements IInstalledAppsRepository {
  async getInstalledApps(): Promise<AppInfo[]> {
    if (Platform.OS !== 'android') {
      return IOS_DEV_MOCK_APPS;
    }

    return AppListAdapter.getInstalledApps();
  }
}
