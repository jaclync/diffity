import { getCurrentBranch } from '@diffity/git';
import {
  detectRemote,
  isCliInstalled,
  fetchPrDescription,
  updatePrDescription,
  type PrDescriptionRemote,
} from '@diffity/github';
import { getDb } from './db.js';

export interface DescriptionState {
  source: 'pr' | 'local';
  branch: string;
  title: string;
  body: string;
  prNumber?: number;
  prUrl?: string;
  dirty: boolean;
}

interface LocalDraft {
  title: string;
  body: string;
  updatedAt: string;
}

const REMOTE_TTL_MS = 60_000;
let remoteCache: { value: PrDescriptionRemote | null; fetchedAt: number } | null = null;

function getLocalDraft(branch: string): LocalDraft | null {
  const row = getDb().prepare(
    'SELECT title, body, updated_at FROM pr_descriptions WHERE branch = ?'
  ).get(branch) as { title: string; body: string; updated_at: string } | undefined;
  if (!row) {
    return null;
  }
  return { title: row.title, body: row.body, updatedAt: row.updated_at };
}

function saveLocalDraft(branch: string, title: string, body: string): void {
  getDb().prepare(`
    INSERT INTO pr_descriptions (branch, title, body, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(branch) DO UPDATE SET title = excluded.title, body = excluded.body, updated_at = excluded.updated_at
  `).run(branch, title, body, new Date().toISOString());
}

let githubAvailable: boolean | null = null;

// Deliberately no `gh auth status` here — it makes a network round-trip.
// An unauthenticated `gh pr view` simply fails and we fall back to local.
function canUseGitHub(): boolean {
  if (githubAvailable === null) {
    githubAvailable = !!detectRemote() && isCliInstalled();
  }
  return githubAvailable;
}

async function getRemote(local: LocalDraft | null): Promise<PrDescriptionRemote | null> {
  if (!canUseGitHub()) {
    return null;
  }
  const now = Date.now();
  const cacheValid = remoteCache && now - remoteCache.fetchedAt < REMOTE_TTL_MS;
  // A local edit newer than the cache means an agent CLI process just pushed —
  // bypass the TTL so we don't reconcile against a stale remote body.
  const localIsNewer = local && remoteCache && Date.parse(local.updatedAt) > remoteCache.fetchedAt;
  if (cacheValid && !localIsNewer) {
    return remoteCache!.value;
  }
  remoteCache = { value: await fetchPrDescription(), fetchedAt: now };
  return remoteCache.value;
}

export function invalidateRemoteCache(): void {
  remoteCache = null;
}

export async function getDescriptionState(): Promise<DescriptionState> {
  const branch = getCurrentBranch();
  const local = getLocalDraft(branch);
  const remote = await getRemote(local);

  if (remote) {
    // Keep an unpushed local draft visible when the PR body is still empty
    // (drafted locally before the PR was created).
    const keepDraft = local && local.body.trim() !== '' && remote.body.trim() === '';
    if (keepDraft) {
      return {
        source: 'pr',
        branch,
        title: remote.title || local.title,
        body: local.body,
        prNumber: remote.number,
        prUrl: remote.url,
        dirty: true,
      };
    }
    if (!local || local.body !== remote.body || local.title !== remote.title) {
      saveLocalDraft(branch, remote.title, remote.body);
    }
    return {
      source: 'pr',
      branch,
      title: remote.title,
      body: remote.body,
      prNumber: remote.number,
      prUrl: remote.url,
      dirty: false,
    };
  }

  return {
    source: 'local',
    branch,
    title: local?.title ?? '',
    body: local?.body ?? '',
    dirty: false,
  };
}

export async function saveDescription(input: { title?: string; body: string }): Promise<DescriptionState & { synced: boolean }> {
  const branch = getCurrentBranch();
  const local = getLocalDraft(branch);
  const remote = canUseGitHub() ? await fetchPrDescription() : null;
  const title = input.title ?? remote?.title ?? local?.title ?? '';

  saveLocalDraft(branch, title, input.body);

  if (remote) {
    updatePrDescription(remote.number, input.title, input.body);
    remoteCache = {
      value: { number: remote.number, title, body: input.body, url: remote.url },
      fetchedAt: Date.now(),
    };
    return {
      source: 'pr',
      branch,
      title,
      body: input.body,
      prNumber: remote.number,
      prUrl: remote.url,
      dirty: false,
      synced: true,
    };
  }

  return { source: 'local', branch, title, body: input.body, dirty: false, synced: false };
}
