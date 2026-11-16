export type CapabilityState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'local';

export interface LocalCapability {
  id: 'notifications' | 'microphone' | 'location' | 'calendar' | 'storage';
  state: CapabilityState;
}

export interface PermissionLike {
  query: (descriptor: { name: string }) => Promise<{ state: string }>;
}

export interface CapabilityEnvironment {
  permissions?: PermissionLike;
  notificationPermission?: string;
  storagePersisted?: () => Promise<boolean>;
}

const STATES: CapabilityState[] = ['granted', 'denied', 'prompt'];

function normalize(value: string | undefined): CapabilityState {
  return STATES.includes(value as CapabilityState) ? (value as CapabilityState) : 'unsupported';
}

async function queryPermission(
  permissions: PermissionLike | undefined,
  name: string
): Promise<CapabilityState> {
  if (!permissions) return 'unsupported';
  try {
    const result = await permissions.query({ name });
    return normalize(result.state);
  } catch {
    // Browsers reject unknown permission names (Firefox rejects microphone, for example).
    return 'unsupported';
  }
}

/**
 * Reports what this browser can actually do. Calendar is always local (an .ics export is the only
 * way out), storage reports whether the browser promised not to evict the demo data, and a device
 * capability the browser cannot query is reported as unsupported rather than guessed.
 */
export async function probeLocalCapabilities(
  env: CapabilityEnvironment = {}
): Promise<LocalCapability[]> {
  const [microphone, location] = await Promise.all([
    queryPermission(env.permissions, 'microphone'),
    queryPermission(env.permissions, 'geolocation')
  ]);

  let storage: CapabilityState = 'unsupported';
  if (env.storagePersisted) {
    try {
      storage = (await env.storagePersisted()) ? 'granted' : 'prompt';
    } catch {
      storage = 'unsupported';
    }
  }

  return [
    { id: 'notifications', state: normalize(env.notificationPermission) },
    { id: 'microphone', state: microphone },
    { id: 'location', state: location },
    { id: 'calendar', state: 'local' },
    { id: 'storage', state: storage }
  ];
}

/** Reads the browser's real capability surface; safe to call when APIs are missing. */
export function browserCapabilityEnvironment(): CapabilityEnvironment {
  const permissions: PermissionLike | undefined =
    typeof navigator !== 'undefined' && navigator.permissions
      ? {
          query: descriptor =>
            navigator.permissions.query(descriptor as PermissionDescriptor) as Promise<{
              state: string;
            }>
        }
      : undefined;
  return {
    permissions,
    notificationPermission:
      typeof Notification !== 'undefined' ? Notification.permission : undefined,
    storagePersisted:
      typeof navigator !== 'undefined' && navigator.storage?.persisted
        ? () => navigator.storage.persisted()
        : undefined
  };
}
