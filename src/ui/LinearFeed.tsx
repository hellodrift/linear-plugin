/**
 * LinearFeed — Feed canvas component for the Linear plugin.
 *
 * Renders a card with filtered Linear issues on the home feed.
 * Issues can be selected and launched as agent workstreams.
 * Launched issues show a clickable workstream chip with live status.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { FeedCanvasProps } from '@tryvienna/sdk';
import { usePluginClient, usePluginQuery } from '@tryvienna/sdk/react';
import {
  GET_PROJECTS,
  CREATE_WORKSTREAM,
  SEND_WORKSTREAM_MESSAGE,
} from '@tryvienna/sdk/graphql';
import type {
  GetProjectsResult,
  CreateWorkstreamResult,
  CreateWorkstreamVariables,
  SendWorkstreamMessageResult,
  SendWorkstreamMessageVariables,
} from '@tryvienna/sdk/graphql';
import {
  Checkbox,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  Button,
} from '@tryvienna/ui';
import { Check, ChevronDown, ChevronUp, Loader2, Zap } from 'lucide-react';
import { GET_LINEAR_FEED_ISSUES, LINK_WORKSTREAM_ENTITY } from '../client/operations';
import { useLinearFeedSettings } from './useLinearFeedSettings';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const LINEAR_LOGO_PATH =
  'M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z';

const COLLAPSED_LIMIT = 5;
const FETCH_LIMIT = 50;
const STATUS_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'unstarted', label: 'Unstarted' },
  { value: 'started', label: 'Started' },
  { value: 'completed', label: 'Completed' },
] as const;

const ASSIGNEE_OPTIONS = [
  { value: 'assigned_to_me', label: 'Me' },
  { value: 'all', label: 'Anyone' },
  { value: 'created_by_me', label: 'Created by me' },
] as const;

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: '1', label: 'Urgent' },
  { value: '2', label: 'High' },
  { value: '3', label: 'Normal' },
  { value: '4', label: 'Low' },
] as const;

const SORT_OPTIONS = [
  { value: 'created', label: 'Created' },
  { value: 'updated', label: 'Updated' },
  { value: 'priority', label: 'Priority' },
] as const;

const priorityColors: Record<number, string> = {
  1: 'text-red-500',
  2: 'text-orange-500',
  3: 'text-muted-foreground',
  4: 'text-muted-foreground/60',
};

type LaunchPhase = 'idle' | 'creating' | 'messaging' | 'success';

const MAX_BRANCH_LENGTH = 50;

function toBranchName(identifier: string, title: string): string {
  const slug = `${identifier}-${title}`
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return slug.length > MAX_BRANCH_LENGTH
    ? slug.slice(0, MAX_BRANCH_LENGTH).replace(/-$/, '')
    : slug;
}

// ─────────────────────────────────────────────────────────────────────────────
// Micro-animation styles
// ─────────────────────────────────────────────────────────────────────────────

const ANIM_STYLE = `
@keyframes feed-cta-enter {
  0% { opacity: 0; transform: translateY(8px) scale(0.97); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.01); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes feed-cta-count {
  0% { transform: scale(1); }
  40% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
@keyframes feed-success-check {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  50% { transform: scale(1.2) rotate(0deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
.feed-cta-enter { animation: feed-cta-enter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.feed-cta-count { animation: feed-cta-count 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); }
.feed-success-check { animation: feed-success-check 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
`;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LinearFeedIssue {
  id: string;
  title: string;
  identifier: string;
  status: string;
  stateName: string;
  priority: number;
  priorityLabel: string;
  assigneeName?: string;
  teamKey?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
  labels?: { name: string; color: string }[];
  projectName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function LinearLogo({ className }: { className?: string }) {
  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className={`block dark:hidden ${className ?? ''}`}
        fill="#222326"
      >
        <path d={LINEAR_LOGO_PATH} />
      </svg>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 100 100"
        className={`hidden dark:block ${className ?? ''}`}
        fill="#fff"
      >
        <path d={LINEAR_LOGO_PATH} />
      </svg>
    </>
  );
}

function StatusMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (status: string) => {
    if (value.includes(status)) {
      if (value.length > 1) onChange(value.filter((v) => v !== status));
    } else {
      onChange([...value, status]);
    }
  };

  const label =
    value.length === STATUS_OPTIONS.length
      ? 'All'
      : value.length === 1
        ? STATUS_OPTIONS.find((o) => o.value === value[0])?.label ?? 'Status'
        : `${value.length} statuses`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-7 gap-1 text-xs font-normal">
          {label}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[140px]">
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={value.includes(opt.value)}
            onCheckedChange={() => toggle(opt.value)}
            onSelect={(e) => e.preventDefault()}
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IssueRow({
  issue,
  selected,
  onToggle,
  onNavigate,
}: {
  issue: LinearFeedIssue;
  selected: boolean;
  onToggle: () => void;
  onNavigate?: (uri: string) => void;
}) {
  return (
    <div
      className={`flex w-full items-center gap-2 px-4 py-2 transition-colors ${
        selected ? 'bg-primary/[0.04]' : ''
      }`}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={onToggle}
        className="shrink-0"
      />
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm hover:underline"
        onClick={() => onNavigate?.(`@vienna//linear_issue/${issue.id}`)}
      >
        <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
          {issue.identifier}
        </span>
        <span className="min-w-0 flex-1 truncate">{issue.title}</span>
      </button>
      {issue.priority > 0 && issue.priority <= 4 && (
        <span className={`shrink-0 text-[10px] font-semibold ${priorityColors[issue.priority] ?? ''}`}>
          P{issue.priority}
        </span>
      )}
      {issue.assigneeName && (
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {issue.assigneeName.split(' ')[0]}
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA Button content by phase
// ─────────────────────────────────────────────────────────────────────────────

function LaunchButtonContent({
  phase,
  count,
  countKey,
}: {
  phase: LaunchPhase;
  count: number;
  countKey: number;
}) {
  switch (phase) {
    case 'creating':
      return (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Launching agents...</span>
        </>
      );
    case 'messaging':
      return (
        <>
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Messaging agents...</span>
        </>
      );
    case 'success':
      return (
        <>
          <Check className="feed-success-check h-4 w-4" />
          <span>Launched</span>
        </>
      );
    case 'idle':
    default:
      return (
        <>
          <Zap className="h-3.5 w-3.5" />
          <span>Launch agents</span>
          <span
            key={countKey}
            className="feed-cta-count inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-xs font-semibold"
          >
            {count}
          </span>
        </>
      );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function LinearFeed({ onNavigate }: FeedCanvasProps) {
  const client = usePluginClient();
  const { settings, updateSettings } = useLinearFeedSettings();
  const [expanded, setExpanded] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [countKey, setCountKey] = useState(0);
  const [launchPhase, setLaunchPhase] = useState<LaunchPhase>('idle');

  // Build query variables
  const statusTypes = settings.statusTypes.length > 0 ? settings.statusTypes : undefined;
  const assignmentFilter = settings.assignee === 'all' ? undefined : settings.assignee;

  const { data, loading } = usePluginQuery<{ linearIssues: LinearFeedIssue[] }>(
    GET_LINEAR_FEED_ISSUES,
    {
      variables: {
        limit: FETCH_LIMIT,
        statusTypes,
        assignmentFilter,
      },
      fetchPolicy: 'cache-and-network',
    },
  );

  const issues = data?.linearIssues ?? [];

  // Client-side priority filter + sort
  const filteredAndSorted = useMemo(() => {
    let result = issues;

    if (settings.priority !== 'all') {
      const p = Number(settings.priority);
      result = result.filter((i) => i.priority === p);
    }

    result = [...result].sort((a, b) => {
      switch (settings.sortBy) {
        case 'priority':
          return (a.priority || 99) - (b.priority || 99);
        case 'updated':
          return (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '');
        case 'created':
        default:
          return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
      }
    });

    return result;
  }, [issues, settings.priority, settings.sortBy]);

  const displayedIssues = expanded
    ? filteredAndSorted
    : filteredAndSorted.slice(0, COLLAPSED_LIMIT);
  const remaining = filteredAndSorted.length - COLLAPSED_LIMIT;

  const toggleExpanded = useCallback(() => setExpanded((v) => !v), []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setCountKey((k) => k + 1);
  }, []);

  // Small helper to yield to React's render cycle between phases
  const tick = useCallback(() => new Promise<void>((r) => setTimeout(r, 50)), []);

  const handleLaunchAgents = useCallback(async () => {
    if (launchPhase !== 'idle' || selectedIds.size === 0) return;

    try {
      const selectedIssues = filteredAndSorted.filter((i) => selectedIds.has(i.id));

      // ── Phase 1: Creating workstreams ──────────────────────────────────
      setLaunchPhase('creating');
      await tick();

      const { data: projectsData } = await client.query<GetProjectsResult>({
        query: GET_PROJECTS,
      });
      const projectId = projectsData?.projects?.[0]?.id;
      if (!projectId) {
        console.warn('[LinearFeed] No project found');
        setLaunchPhase('idle');
        return;
      }

      // Create workstreams + link entities sequentially so UI stays responsive
      const workstreamIds: string[] = [];

      for (const issue of selectedIssues) {
        const { data: wsResult } = await client.mutate<
          CreateWorkstreamResult,
          CreateWorkstreamVariables
        >({
          mutation: CREATE_WORKSTREAM,
          variables: {
            input: {
              projectId,
              title: `${issue.identifier} ${issue.title}`,
              groupName: 'Linear Tasks',
              createWorktrees: true,
              branchName: toBranchName(issue.identifier, issue.title),
            },
          },
        });

        const ws = wsResult?.createWorkstream?.workstream;
        if (!ws) continue;

        // Link the entity
        await client.mutate({
          mutation: LINK_WORKSTREAM_ENTITY,
          variables: {
            workstreamId: ws.id,
            entityUri: `@vienna//linear_issue/${issue.id}`,
            entityType: 'linear_issue',
            entityTitle: issue.title,
          },
        });

        workstreamIds.push(ws.id);
      }

      // ── Phase 2: Messaging agents ─────────────────────────────────────
      setLaunchPhase('messaging');
      await tick();

      for (const wsId of workstreamIds) {
        await client.mutate<
          SendWorkstreamMessageResult,
          SendWorkstreamMessageVariables
        >({
          mutation: SEND_WORKSTREAM_MESSAGE,
          variables: {
            workstreamId: wsId,
            text: 'Work on this linear task',
          },
        });
      }

      // ── Phase 3: Success ──────────────────────────────────────────────
      setLaunchPhase('success');
      setSelectedIds(new Set());
      await tick();

      // Hold success state, then reset
      setTimeout(() => setLaunchPhase('idle'), 2500);
    } catch (err) {
      console.error('[LinearFeed] Failed to launch agents:', err);
      setLaunchPhase('idle');
    }
  }, [launchPhase, selectedIds, filteredAndSorted, client, tick]);

  const selectionCount = selectedIds.size;
  const showCta = selectionCount > 0 || launchPhase !== 'idle';

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm dark:bg-surface-interactive">
      <style dangerouslySetInnerHTML={{ __html: ANIM_STYLE }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <LinearLogo className="h-4 w-4" />
          <span className="text-sm font-medium">Linear</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs font-normal text-muted-foreground">
              {SORT_OPTIONS.find((o) => o.value === settings.sortBy)?.label ?? 'Sort'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={settings.sortBy}
              onValueChange={(v) => updateSettings({ sortBy: v as 'created' | 'updated' | 'priority' })}
            >
              {SORT_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-2">
        <StatusMultiSelect
          value={settings.statusTypes}
          onChange={(statusTypes) => updateSettings({ statusTypes })}
        />

        <div className="mx-1 h-4 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
              {ASSIGNEE_OPTIONS.find((o) => o.value === settings.assignee)?.label ?? 'Assignee'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={settings.assignee}
              onValueChange={(v) => updateSettings({ assignee: v as 'all' | 'assigned_to_me' | 'created_by_me' })}
            >
              {ASSIGNEE_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1">
              {PRIORITY_OPTIONS.find((o) => o.value === settings.priority)?.label ?? 'Priority'}
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuRadioGroup
              value={settings.priority}
              onValueChange={(v) => updateSettings({ priority: v })}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Issue list */}
      <div className="border-t border-border">
        {loading && issues.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">Loading...</p>
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="px-4 py-3">
            <p className="text-xs text-muted-foreground">No issues found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedIssues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                selected={selectedIds.has(issue.id)}
                onToggle={() => toggleSelection(issue.id)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* View more / Show less */}
      {filteredAndSorted.length > COLLAPSED_LIMIT && (
        <button
          type="button"
          className="flex w-full items-center justify-center gap-1 border-t border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/50"
          onClick={toggleExpanded}
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              View more ({remaining}) <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      )}

      {/* Selection CTA */}
      {showCta && (
        <div className="feed-cta-enter border-t border-border bg-primary/[0.06] px-4 py-2.5">
          <button
            type="button"
            disabled={launchPhase !== 'idle'}
            className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
              launchPhase === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
            onClick={handleLaunchAgents}
          >
            <LaunchButtonContent
              phase={launchPhase}
              count={selectionCount}
              countKey={countKey}
            />
          </button>
        </div>
      )}
    </div>
  );
}
