import { LimitReachedPayload } from '../../core/types/domain.types';
import { Routes } from './routes';

export type RootStackParamList = {
  [Routes.Home]: undefined;
  [Routes.AddApp]: undefined;
  [Routes.Goals]: undefined;
  [Routes.BlockOverlay]: LimitReachedPayload;
};
