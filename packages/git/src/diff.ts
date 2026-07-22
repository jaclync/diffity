import { rmSync } from 'node:fs';
import { git, gitLarge, gitLines, gitWithStdin } from './exec.js';

export function getDiff(args: string[] = []): string {
  return gitLarge(['diff', ...args]);
}

export function getUntrackedFiles(): string[] {
  return gitLines(['ls-files', '--others', '--exclude-standard']);
}

export function getUntrackedDiff(files: string[]): string {
  const diffs: string[] = [];

  for (const file of files) {
    try {
      gitLarge(['diff', '--no-index', '--', '/dev/null', file]);
    } catch (err: unknown) {
      const error = err as { stdout?: string; status?: number };
      if (error.status === 1 && error.stdout) {
        diffs.push(error.stdout);
      }
    }
  }

  return diffs.join('\n');
}

export type RefDiffArgs = { type: 'args'; args: string[]; includeUntracked: boolean };

export function resolveDiffArgs(ref: string): RefDiffArgs {
  switch (ref) {
    case 'staged':
      return { type: 'args', args: ['--staged'], includeUntracked: false };
    case 'unstaged':
      return { type: 'args', args: [], includeUntracked: false };
    case '.':
    case 'work':
      return { type: 'args', args: ['HEAD'], includeUntracked: true };
    default:
      // Range refs (a..b, a...b) diff two committed states — the working
      // tree's untracked files are not part of either side.
      return { type: 'args', args: [normalizeRef(ref)], includeUntracked: !ref.includes('..') };
  }
}

export function resolveRef(ref: string, extraArgs: string[] = []): string {
  const resolved = resolveDiffArgs(ref);

  let raw = getDiff([...resolved.args, ...extraArgs]);
  if (resolved.includeUntracked) {
    const untrackedFiles = getUntrackedFiles();
    if (untrackedFiles.length > 0) {
      raw += '\n' + getUntrackedDiff(untrackedFiles);
    }
  }
  return raw;
}

export function getDiffFiles(ref: string): string[] {
  const resolved = resolveDiffArgs(ref);

  const tracked = gitLines(['diff', '--name-only', ...resolved.args]);
  if (resolved.includeUntracked) {
    const untracked = getUntrackedFiles();
    return [...new Set([...tracked, ...untracked])];
  }
  return tracked;
}

export function getDiffStat(args: string[] = []): string {
  try {
    return gitLarge(['diff', '--stat', ...args]);
  } catch {
    return '';
  }
}

export function getDiffStatForRef(ref: string): string {
  const resolved = resolveDiffArgs(ref);

  let stat = getDiffStat(resolved.args);
  if (resolved.includeUntracked) {
    stat += '\n' + getUntrackedFiles().join('\n');
  }
  return stat;
}

export function revertFile(filePath: string, isUntracked: boolean): void {
  if (isUntracked) {
    rmSync(filePath, { force: true });
  } else {
    git(['checkout', 'HEAD', '--', filePath]);
  }
}

export function revertHunk(patch: string): void {
  gitWithStdin(['apply', '--reverse', '--unidiff-zero'], patch);
}

export function getMergeBase(a: string, b: string): string {
  return git(['merge-base', a, b]);
}

export function normalizeRef(ref: string): string {
  if (ref.includes('...')) {
    return ref;
  }
  const idx = ref.indexOf('..');
  if (idx !== -1) {
    const left = ref.slice(0, idx);
    const right = ref.slice(idx + 2);
    const base = getMergeBase(left, right);
    return `${base}..${right}`;
  }
  return getMergeBase(ref, 'HEAD');
}

export const WORKING_TREE_REFS = new Set(['work', '.', 'staged', 'unstaged']);

export function resolveBaseRef(ref: string): string {
  if (WORKING_TREE_REFS.has(ref)) {
    return 'HEAD';
  }

  const threeDotsIdx = ref.indexOf('...');
  if (threeDotsIdx !== -1) {
    const left = ref.slice(0, threeDotsIdx);
    const right = ref.slice(threeDotsIdx + 3);
    return getMergeBase(left, right);
  }

  const twoDotsIdx = ref.indexOf('..');
  if (twoDotsIdx !== -1) {
    const left = ref.slice(0, twoDotsIdx);
    const right = ref.slice(twoDotsIdx + 2);
    return getMergeBase(left, right);
  }

  return getMergeBase(ref, 'HEAD');
}

export function getFileContent(path: string, ref = 'HEAD'): string {
  return git(['show', `${ref}:${path}`]);
}

export function getFileLineCount(path: string, ref = 'HEAD'): number | null {
  try {
    const content = git(['show', `${ref}:${path}`]);
    return content.split('\n').length;
  } catch {
    return null;
  }
}
