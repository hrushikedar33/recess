import { useEffect } from 'react';
import { DeviceEventEmitter, EmitterSubscription } from 'react-native';

export function useDeviceEventListener<T>(
  eventName: string,
  handler: (payload: T) => void,
): void {
  useEffect(() => {
    const subscription: EmitterSubscription = DeviceEventEmitter.addListener(
      eventName,
      handler,
    );

    return () => subscription.remove();
  }, [eventName, handler]);
}
