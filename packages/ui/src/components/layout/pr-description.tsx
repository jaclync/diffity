import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDescription, saveDescription, type DescriptionState } from '../../lib/api';
import { MarkdownContent } from './markdown-content';
import { PencilIcon } from '../icons/pencil-icon';

function SourceBadge(props: { state: DescriptionState }) {
  const { state } = props;
  if (state.source === 'pr') {
    return (
      <span className="flex items-center gap-1.5">
        <a
          href={state.prUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="text-xs font-medium bg-accent/15 text-accent px-1.5 py-0.5 rounded-full hover:bg-accent/25 transition-colors"
        >
          PR #{state.prNumber}
        </a>
        {state.dirty ? (
          <span className="text-xs font-medium bg-orange-500/15 text-orange-500 px-1.5 py-0.5 rounded-full" title="This draft was written locally and has not been pushed to the PR yet. Save to push it.">
            unpushed draft
          </span>
        ) : (
          <span className="text-xs text-text-muted" title="Kept in sync with the PR description on GitHub">
            synced
          </span>
        )}
      </span>
    );
  }
  return (
    <span className="text-xs font-medium bg-bg-tertiary text-text-muted px-1.5 py-0.5 rounded-full" title="No PR exists for this branch yet. The description is stored locally and can seed the PR when you create it.">
      Local draft
    </span>
  );
}

function DescriptionEditor(props: {
  state: DescriptionState;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { state, onCancel, onSaved } = props;
  const [title, setTitle] = useState(state.title);
  const [body, setBody] = useState(state.body);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => saveDescription({ title: title.trim() ? title : undefined, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['description'] });
      onSaved();
    },
  });

  return (
    <div className="p-3 flex flex-col gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full px-2.5 py-1.5 text-sm font-medium bg-bg border border-border rounded-md text-text placeholder:text-text-muted focus:outline-none focus:border-accent"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Describe this change (markdown supported)..."
        rows={10}
        className="w-full px-2.5 py-1.5 text-sm bg-bg border border-border rounded-md text-text placeholder:text-text-muted focus:outline-none focus:border-accent resize-y font-mono leading-5"
      />
      {mutation.isError && (
        <p className="text-xs text-deleted">{(mutation.error as Error).message}</p>
      )}
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          disabled={mutation.isPending}
          className="text-xs px-2.5 py-1 rounded-md text-text-secondary hover:text-text transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="text-xs font-medium px-2.5 py-1 rounded-md bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer disabled:opacity-60"
        >
          {mutation.isPending
            ? 'Saving...'
            : state.source === 'pr' ? 'Save & push to PR' : 'Save draft'}
        </button>
      </div>
    </div>
  );
}

export function PrDescription() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const { data: state } = useQuery({
    queryKey: ['description'],
    queryFn: fetchDescription,
    refetchInterval: 5000,
  });

  if (!state) {
    return null;
  }

  const isEmpty = !state.body.trim() && !state.title.trim();

  return (
    <div className="rounded-lg mx-4 mt-4 overflow-hidden bg-bg-secondary">
      <div className="flex items-center gap-2 px-3 py-2 text-sm select-none">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-[10px] w-5 h-5 shrink-0 flex items-center justify-center text-text-muted cursor-pointer"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <span className="text-text-secondary">Description</span>
          <SourceBadge state={state} />
        </button>
        <div className="flex-1" />
        {!isEditing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
              setIsEditing(true);
            }}
            className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover transition-colors cursor-pointer"
          >
            <PencilIcon className="w-3 h-3" />
            {isEmpty ? 'Add description' : 'Edit'}
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="bg-bg rounded-md mx-1.5 mb-1.5">
          {isEditing ? (
            <DescriptionEditor
              state={state}
              onCancel={() => setIsEditing(false)}
              onSaved={() => setIsEditing(false)}
            />
          ) : isEmpty ? (
            <div className="px-3 py-4 text-center text-xs text-text-muted">
              No description yet
            </div>
          ) : (
            <div className="p-3 text-sm">
              {state.title.trim() && (
                <p className="font-semibold text-text text-base mb-2">{state.title}</p>
              )}
              <MarkdownContent content={state.body} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
