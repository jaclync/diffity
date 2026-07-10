import { git, gitLines } from './exec.js';

export function getStagedFiles(): string[] {
  return gitLines(['diff', '--staged', '--name-only']);
}

export function getUnstagedFiles(): string[] {
  return gitLines(['diff', '--name-only']);
}

export function isDirty(): boolean {
  return git(['status', '--porcelain']).length > 0;
}
