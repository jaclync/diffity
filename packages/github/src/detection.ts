import { run, runAsync, runSilent } from './exec.js';
import type { GitHubRemote, GitHubDetails } from './types.js';

export function getRemote(): { owner: string; repo: string } | null {
  try {
    const url = run('git', ['remote', 'get-url', 'origin']);
    const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  } catch {
    return null;
  }
}

export function isCliInstalled(): boolean {
  return runSilent('gh', ['--version']);
}

export function isAuthenticated(): boolean {
  return runSilent('gh', ['auth', 'status']);
}

export function detectRemote(): GitHubRemote | null {
  const remote = getRemote();
  if (!remote) {
    return null;
  }
  return remote;
}

export async function fetchDetails(owner: string, repo: string): Promise<GitHubDetails | null> {
  if (!isCliInstalled()) {
    return null;
  }

  const pr = await getPr();
  if (!pr) {
    return null;
  }

  const commentCount = await getReviewCommentCount(owner, repo, pr.number);

  return {
    prNumber: pr.number,
    prTitle: pr.title,
    prUrl: pr.url,
    prCreatedAt: pr.createdAt,
    headSha: pr.headSha,
    commentCount,
  };
}

interface PrData {
  number: number;
  title: string;
  url: string;
  headSha: string;
  createdAt: string;
}

async function getPr(): Promise<PrData | null> {
  try {
    const json = await runAsync('gh', ['pr', 'view', '--json', 'number,title,url,headRefOid,createdAt']);
    const data = JSON.parse(json);
    if (data.number && data.url && data.headRefOid) {
      return {
        number: data.number,
        title: data.title,
        url: data.url,
        headSha: data.headRefOid,
        createdAt: data.createdAt,
      };
    }
    return null;
  } catch {
    return null;
  }
}

async function getReviewCommentCount(owner: string, repo: string, prNumber: number): Promise<number> {
  try {
    const raw = await runAsync('gh', [
      'api', `repos/${owner}/${repo}/pulls/${prNumber}/comments`, '--jq', 'length',
    ]);
    return parseInt(raw, 10) || 0;
  } catch {
    return 0;
  }
}
