import type { SVGProps } from 'react';

export function GitCommitIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="4" />
      <line x1="1.5" y1="12" x2="8" y2="12" />
      <line x1="16" y1="12" x2="22.5" y2="12" />
    </svg>
  );
}
