import { execFileSync, type StdioOptions } from 'node:child_process';

const STDIO: StdioOptions = ['pipe', 'pipe', 'pipe'];
const MAX_BUFFER = 50 * 1024 * 1024;

// Every helper invokes `git` directly with an argv array via execFileSync —
// NO shell is spawned. User-controlled refs, paths, and search text therefore
// cannot be interpreted as shell metacharacters, which closes the command
// injection class entirely (a value like "foo`rm -rf ~`" is passed to git as
// one literal argument, not parsed by a shell).

export function git(args: string[]): string {
  return execFileSync('git', args, {
    encoding: 'utf-8',
    stdio: STDIO,
  }).trim();
}

export function gitLarge(args: string[]): string {
  return execFileSync('git', args, {
    encoding: 'utf-8',
    stdio: STDIO,
    maxBuffer: MAX_BUFFER,
  });
}

export function gitLines(args: string[]): string[] {
  const output = git(args);
  if (!output) {
    return [];
  }
  return output.split('\n');
}

export function gitWithStdin(args: string[], input: string): string {
  return execFileSync('git', args, {
    encoding: 'utf-8',
    stdio: STDIO,
    input,
    maxBuffer: MAX_BUFFER,
  });
}
