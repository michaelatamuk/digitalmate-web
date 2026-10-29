const DEFAULT_TTL_MS = 30 * 60 * 1000;

export interface CachedSubmission {
  taskId?: string;
  text: string;
  done: boolean;
}

export interface OrbitSession {
  id: string;
  roomId?: string;
  submissions: Map<string, CachedSubmission>;
  updatedAt: number;
}

export class OrbitSessionStore {
  private readonly sessions = new Map<string, OrbitSession>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly now: () => number = () => Date.now()
  ) {}

  get(id: string): OrbitSession | undefined {
    this.prune();
    const session = this.sessions.get(id);
    if (session) session.updatedAt = this.now();
    return session;
  }

  getOrCreate(id?: string): OrbitSession {
    this.prune();
    const existing = id ? this.sessions.get(id) : undefined;
    if (existing) {
      existing.updatedAt = this.now();
      return existing;
    }
    const session: OrbitSession = {
      id: id || crypto.randomUUID(),
      submissions: new Map(),
      updatedAt: this.now()
    };
    this.sessions.set(session.id, session);
    return session;
  }

  setRoom(session: OrbitSession, roomId: string): void {
    session.roomId = roomId;
    session.updatedAt = this.now();
  }

  getSubmission(session: OrbitSession, submissionId: string): CachedSubmission | undefined {
    return session.submissions.get(submissionId);
  }

  rememberSubmission(
    session: OrbitSession,
    submissionId: string,
    update: Partial<CachedSubmission>
  ): CachedSubmission {
    const current = session.submissions.get(submissionId) ?? { text: '', done: false };
    const next: CachedSubmission = { ...current, ...update };
    session.submissions.set(submissionId, next);
    session.updatedAt = this.now();
    return next;
  }

  size(): number {
    return this.sessions.size;
  }

  delete(id: string): void {
    this.sessions.delete(id);
  }

  prune(): void {
    const cutoff = this.now() - this.ttlMs;
    for (const [id, session] of this.sessions) {
      if (session.updatedAt < cutoff) this.sessions.delete(id);
    }
  }
}

export const orbitSessions = new OrbitSessionStore();

export function readCookie(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    if (key !== name) continue;
    const value = part.slice(index + 1).trim();
    return value || undefined;
  }
  return undefined;
}

export function sessionCookie(id: string, secure: boolean, maxAgeSeconds = DEFAULT_TTL_MS / 1000): string {
  return [
    `dm_orbit_session=${id}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(maxAgeSeconds)}`,
    ...(secure ? ['Secure'] : [])
  ].join('; ');
}
