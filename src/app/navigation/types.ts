import { LimitReachedPayload } from '../../core/types/domain.types';
import { Routes } from './routes';

export type RootStackParamList = {
  [Routes.Home]: undefined;
  [Routes.AddApp]: undefined;
  [Routes.BlockOverlay]: LimitReachedPayload;
};
