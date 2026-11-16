import { describe, expect, it } from 'vitest';
import {
  probeLocalCapabilities,
  type CapabilityEnvironment,
  type PermissionLike
} from '../src/lib/localCapabilities';

function permissions(state: string): PermissionLike {
  return { query: async () => ({ state }) };
}

function byId(list: Awaited<ReturnType<typeof probeLocalCapabilities>>, id: string) {
  return list.find(item => item.id === id)?.state;
}

describe('local capability probe', () => {
  it('reports granted, prompt and denied browser permissions', async () => {
    const list = await probeLocalCapabilities({
      permissions: permissions('granted'),
      notificationPermission: 'denied',
      storagePersisted: async () => true
    });

    expect(byId(list, 'notifications')).toBe('denied');
    expect(byId(list, 'microphone')).toBe('granted');
    expect(byId(list, 'location')).toBe('granted');
    expect(byId(list, 'calendar')).toBe('local');
    expect(byId(list, 'storage')).toBe('granted');
  });

  it('maps an unpersisted storage bucket to prompt and an unknown notification state to unsupported', async () => {
    const list = await probeLocalCapabilities({
      permissions: permissions('prompt'),
      notificationPermission: 'default',
      storagePersisted: async () => false
    });

    expect(byId(list, 'notifications')).toBe('unsupported');
    expect(byId(list, 'storage')).toBe('prompt');
  });

  it('marks permissions the browser refuses to answer as unsupported', async () => {
    const list = await probeLocalCapabilities({
      permissions: {
        query: async () => {
          throw new Error('unknown permission');
        }
      },
      storagePersisted: async () => {
        throw new Error('no storage API');
      }
    });

    expect(byId(list, 'microphone')).toBe('unsupported');
    expect(byId(list, 'location')).toBe('unsupported');
    expect(byId(list, 'storage')).toBe('unsupported');
    expect(byId(list, 'calendar')).toBe('local');
  });

  it('works with no environment at all', async () => {
    const env: CapabilityEnvironment = {};
    const list = await probeLocalCapabilities(env);
    expect(byId(list, 'notifications')).toBe('unsupported');
    expect(byId(list, 'microphone')).toBe('unsupported');
    expect(byId(list, 'location')).toBe('unsupported');
    expect(byId(list, 'storage')).toBe('unsupported');
    expect(byId(list, 'calendar')).toBe('local');
  });
});
