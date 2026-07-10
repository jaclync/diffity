import { execFileSync } from 'node:child_process';
import { exec } from './exec.js';
import type { PrDescriptionRemote } from './types.js';

export function fetchPrDescription(): PrDescriptionRemote | null {
  try {
    const json = exec('gh pr view --json number,title,body,url');
    const data = JSON.parse(json);
    if (data.number && data.url) {
      return {
        number: data.number,
        title: data.title ?? '',
        body: data.body ?? '',
        url: data.url,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function updatePrDescription(prNumber: number, title: string | undefined, body: string): void {
  const args = ['pr', 'edit', String(prNumber), '--body-file', '-'];
  if (title && title.trim()) {
    args.push('--title', title);
  }
  execFileSync('gh', args, {
    input: body,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}
