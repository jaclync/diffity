import { git } from './exec.js';
import type { Commit } from './types.js';

interface CommitQuery {
  count: number;
  skip?: number;
  search?: string;
  range?: string;
}

export function getRecentCommits(query: CommitQuery): Commit[] {
  const { count, skip = 0, search, range } = query;

  const args = ['log', '-n', String(count), `--skip=${skip}`, '--format=%H|%h|%s|%cr'];
  if (search) {
    args.push(`--grep=${search}`, '-i');
  }
  if (range) {
    args.push(range);
  }

  const output = git(args);

  if (!output) {
    return [];
  }

  return output.split('\n').map((line) => {
    const [hash, shortHash, message, relativeDate] = line.split('|');
    return { hash, shortHash, message, relativeDate };
  });
}
