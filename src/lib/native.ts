import { Capacitor, registerPlugin } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function configureNativeShell(): Promise<void> {
  if (!isNativeApp()) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#f7f3ee' });
  } catch {
    // Status bar customization is best-effort.
  }
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
export async function nativeNotification(title: string, body: string): Promise<boolean> {  if (!isNativeApp()) return false;
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

const SharedText = registerPlugin<{ getSharedText: () => Promise<{ text: string }> }>('SharedText');

/** Read text received from Android's share sheet, then clear it. */
export async function consumeSharedText(): Promise<string> {
  if (!isNativeApp()) return '';
  try {
    const result = await SharedText.getSharedText();
    return typeof result.text === 'string' ? result.text : '';
  } catch {
    return '';
  }
}

/** Call the handler when the user taps a local notification. */
export function onNativeNotificationTap(handler: () => void): () => void {
  if (!isNativeApp()) return () => undefined;
  let remove = () => undefined as void;
  void LocalNotifications.addListener('localNotificationActionPerformed', () => handler()).then(
    listener => {
      remove = () => {
        void listener.remove();
      };
    }
  );
  return () => remove();
}

const SharedTextPluginRef = SharedText;

/** Read a tab requested by a widget, shortcut or Quick Settings tile. */
export async function consumeLaunchTab(): Promise<string> {
  if (!isNativeApp()) return '';
  try {
    const result = await (SharedTextPluginRef as unknown as {
      getLaunchTab: () => Promise<{ tab: string }>;
    }).getLaunchTab();
    return typeof result.tab === 'string' ? result.tab : '';
  } catch {
    return '';
  }
}
