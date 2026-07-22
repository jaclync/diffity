import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router';
import { fetchCommits, type Commit } from '../../lib/api';
import { CommitList } from './commit-list';
import { GitCommitIcon } from '../icons/git-commit-icon';
import { ChevronDownIcon } from '../icons/chevron-down-icon';

interface CommitPickerProps {
  currentCommit: string | null;
  range?: string;
}

export function CommitPicker(props: CommitPickerProps) {
  const { currentCommit, range } = props;
  const [open, setOpen] = useState(false);
  const [initialPage, setInitialPage] = useState<{ commits: Commit[]; hasMore: boolean } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open || initialPage) {
      return;
    }
    fetchCommits(0, 10, undefined, range)
      .then((page) => setInitialPage({ commits: page.commits, hasMore: page.hasMore }))
      .catch(() => setInitialPage({ commits: [], hasMore: false }));
  }, [open, initialPage, range]);

  const selectCommit = useCallback((hash: string | null) => {
    setOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (hash) {
        next.set('commit', hash);
      } else {
        next.delete('commit');
      }
      return next;
    });
  }, [setSearchParams]);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-bg-tertiary rounded-md text-[11px] text-text-muted hover:text-text transition-colors cursor-pointer"
        title="View changes by commit"
      >
        <GitCommitIcon className="w-3 h-3" />
        {currentCommit ? (
          <code className="font-mono text-accent">{currentCommit.slice(0, 7)}</code>
        ) : (
          'Commits'
        )}
        <ChevronDownIcon className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-[26rem] max-h-96 overflow-y-auto bg-bg-secondary rounded-md shadow-lg ring-1 ring-border z-50">
          {currentCommit && (
            <button
              onClick={() => selectCommit(null)}
              className="w-full text-left px-4 py-2.5 text-xs text-accent hover:bg-bg-tertiary transition-colors cursor-pointer border-b border-border"
            >
              ← Back to all changes
            </button>
          )}
          {initialPage ? (
            <CommitList
              initialCommits={initialPage.commits}
              initialHasMore={initialPage.hasMore}
              onCommitClick={selectCommit}
              range={range}
              activeHash={currentCommit}
            />
          ) : (
            <div className="px-4 py-3 text-xs text-text-muted">Loading commits…</div>
          )}
        </div>
      )}
    </div>
  );
}
