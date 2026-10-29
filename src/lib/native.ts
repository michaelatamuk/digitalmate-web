import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/** Returns true when the native share sheet handled the text. */
export async function nativeShare(title: string, text: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  await Share.share({
    title,
    text,
    dialogTitle: title
  });
  return true;
}

/** Returns true/false for native permission, or null when running on the web. */
export async function requestNativeNotificationPermission(): Promise<boolean | null> {
  if (!isNativeApp()) return null;
  const result = await LocalNotifications.requestPermissions();
  return result.display === 'granted';
}

/** Returns true when a native local notification was scheduled. */
export async function nativeNotification(title: string, body: string): Promise<boolean> {
  if (!isNativeApp()) return false;
  const permission = await LocalNotifications.checkPermissions();
  if (permission.display !== 'granted') return false;
  await LocalNotifications.schedule({
    notifications: [
      {
        id: Math.floor(Date.now() % 2_000_000_000),
        title,
        body,
        schedule: { at: new Date(Date.now() + 500) }
      }
    ]
  });
  return true;
}
