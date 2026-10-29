export const BACKUP_APP = 'digitalmate-web';
export const BACKUP_VERSION = 1;
export const STORAGE_PREFIX = 'digitalmate.web.v2.';

export interface BackupFile {
  app: typeof BACKUP_APP;
  version: number;
  exportedAt: string;
  data: Record<string, string>;
}

export interface BackupSummary {
  keys: number;
  bytes: number;
}

export function collectBackup(storage: Storage, now = new Date()): BackupFile {
  const data: Record<string, string> = {};
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const value = storage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data
  };
}

export function serializeBackup(backup: BackupFile): string {
  return JSON.stringify(backup, null, 2);
}

export function parseBackup(text: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error('Backup is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Backup must be a JSON object');
  }
  const value = parsed as Record<string, unknown>;
  if (value.app !== BACKUP_APP) throw new Error('This is not a DigitalMate Web backup');
  if (value.version !== BACKUP_VERSION) throw new Error('Unsupported backup version');
  if (!value.data || typeof value.data !== 'object' || Array.isArray(value.data)) {
    throw new Error('Backup data is missing');
  }

  const data: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value.data as Record<string, unknown>)) {
    if (!key.startsWith(STORAGE_PREFIX)) continue;
    if (typeof entry !== 'string') throw new Error(`Invalid value for ${key}`);
    data[key] = entry;
  }
  if (Object.keys(data).length === 0) throw new Error('Backup contains no DigitalMate data');

  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : new Date().toISOString(),
    data
  };
}

export function summarizeBackup(backup: BackupFile): BackupSummary {
  const serialized = serializeBackup(backup);
  return {
    keys: Object.keys(backup.data).length,
    bytes: new Blob([serialized]).size
  };
}

export function restoreBackup(storage: Storage, text: string): BackupSummary {
  const backup = parseBackup(text);

  const existing: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(STORAGE_PREFIX)) existing.push(key);
  }
  for (const key of existing) storage.removeItem(key);
  for (const [key, value] of Object.entries(backup.data)) storage.setItem(key, value);

  return summarizeBackup(backup);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
