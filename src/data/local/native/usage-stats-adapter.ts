import { NativeModules } from 'react-native';
import { UsageStatsNativeModule } from '../../../core/types/native.types';

const { UsageStatsModule } = NativeModules;

export const UsageStatsAdapter = UsageStatsModule as UsageStatsNativeModule;
