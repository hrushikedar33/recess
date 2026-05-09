import { NativeModules } from 'react-native';
import { AppListNativeModule } from '../../../core/types/native.types';

const { AppListModule } = NativeModules;

export const AppListAdapter = AppListModule as AppListNativeModule;
