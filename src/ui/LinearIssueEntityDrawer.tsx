/**
 * LinearIssueEntityDrawer — Entity drawer for Linear issues.
 *
 * Provides full issue editing: properties (status, priority, assignee, labels,
 * project, cycle, estimate, due date), description, sub-issues, relations,
 * and comments. Registered on the linear_issue entity via `ui: { drawer }`.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import {
  DrawerBody,
  DrawerPanelFooter,
  Separator,
  Button,
  ConfirmDialog,
  Markdown,
  MarkdownEditor,
  InlineEdit,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Combobox,
  Textarea,
} from '@tryvienna/ui';
import type { ComboboxOption } from '@tryvienna/ui';
import { Pencil, Trash2, ExternalLink } from 'lucide-react';
import { parseEntityURI } from '@tryvienna/sdk';
import { usePluginQuery, usePluginMutation } from '@tryvienna/sdk/react';
import type { EntityDrawerProps } from '@tryvienna/sdk';
import { PRIORITY_LABELS } from '../helpers';
import { LINEAR_URI_PATH } from '../entities/uri';
import {
  GET_LINEAR_ISSUE,
  GET_LINEAR_WORKFLOW_STATES,
  GET_LINEAR_TEAM_MEMBERS,
  GET_LINEAR_LABELS,
  GET_LINEAR_PROJECTS,
  GET_LINEAR_CYCLES,
  GET_LINEAR_COMMENTS,
  GET_LINEAR_SUB_ISSUES,
  GET_LINEAR_ISSUE_RELATIONS,
  UPDATE_LINEAR_ISSUE,
  DELETE_LINEAR_ISSUE,
  ADD_LINEAR_COMMENT,
} from '../client/operations';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Sentinel value for "no selection" in Radix Select (empty strings not allowed). */
const NONE = '__none__';

const PRIORITY_OPTIONS = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));

/** Fibonacci-based story point estimates used by Linear. */
const ESTIMATE_OPTIONS = [1, 2, 3, 5, 8, 13, 21];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SavingBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="flex items-center gap-2 rounded bg-muted/50 px-3 py-1.5">
      <div className="size-1.5 rounded-full bg-foreground/40 animate-pulse" />
      <span className="text-[11px] text-muted-foreground">Saving...</span>
    </div>
  );
}

function ColorDot({ color }: { color: string }) {
  const hex = color.startsWith('#') ? color : `#${color}`;
  return (
    <span
      className="inline-block size-3 rounded-full shrink-0"
      style={{ backgroundColor: hex }}
    />
  );
}

function MetadataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-xs font-medium text-foreground max-w-[60%] text-right">
        {children}
      </div>
    </div>
  );
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Drawer
// ─────────────────────────────────────────────────────────────────────────────

export function LinearIssueEntityDrawer({ uri, headerActions, DrawerContainer, onNavigate, onClose }: EntityDrawerProps) {
  const { id } = parseEntityURI(uri, LINEAR_URI_PATH);
  const issueId = id['id'] ?? '';

  // ── Queries ────────────────────────────────────────────────────────────
  const { data, loading, error } = usePluginQuery<{ linearIssue: any }>(GET_LINEAR_ISSUE, {
    variables: { id: issueId },
    fetchPolicy: 'cache-and-network',
    skip: !issueId,
  });

  const issue = data?.linearIssue;
  const teamId = issue?.teamId;

  const { data: statesData } = usePluginQuery<{ linearWorkflowStates: any[] }>(GET_LINEAR_WORKFLOW_STATES, {
    variables: { teamId: teamId! },
    skip: !teamId,
  });

  const { data: membersData } = usePluginQuery<{ linearTeamMembers: any[] }>(GET_LINEAR_TEAM_MEMBERS, {
    variables: { teamId },
    skip: !teamId,
  });

  const { data: labelsData } = usePluginQuery<{ linearLabels: any[] }>(GET_LINEAR_LABELS, {
    variables: { teamId },
    skip: !teamId,
  });

  const { data: projectsData } = usePluginQuery<{ linearProjects: any[] }>(GET_LINEAR_PROJECTS, {
    variables: { teamId },
    skip: !teamId,
  });

  const { data: cyclesData } = usePluginQuery<{ linearCycles: any[] }>(GET_LINEAR_CYCLES, {
    variables: { teamId: teamId! },
    skip: !teamId,
  });

  const { data: commentsData, refetch: refetchComments } = usePluginQuery<{ linearComments: any[] }>(GET_LINEAR_COMMENTS, {
    variables: { issueId },
    skip: !issueId,
  });

  const { data: subIssuesData } = usePluginQuery<{ linearSubIssues: any[] }>(GET_LINEAR_SUB_ISSUES, {
    variables: { issueId },
    skip: !issueId,
  });

  const { data: relationsData } = usePluginQuery<{ linearIssueRelations: any[] }>(GET_LINEAR_ISSUE_RELATIONS, {
    variables: { issueId },
    skip: !issueId,
  });

  // ── Mutations ──────────────────────────────────────────────────────────
  const [updateIssue, { loading: updateLoading }] = usePluginMutation(UPDATE_LINEAR_ISSUE);
  const [deleteIssue] = usePluginMutation(DELETE_LINEAR_ISSUE);
  const [addComment, { loading: commentLoading }] = usePluginMutation(ADD_LINEAR_COMMENT);

  // ── Local state ────────────────────────────────────────────────────────
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingBody, setEditingBody] = useState(false);
  const [draftBody, setDraftBody] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [optimisticLabels, setOptimisticLabels] = useState<string[] | null>(null);
  const pendingLabelUpdate = useRef(false);

  // ── Derived data ───────────────────────────────────────────────────────
  const states = statesData?.linearWorkflowStates ?? [];
  const members = membersData?.linearTeamMembers ?? [];
  const labels = labelsData?.linearLabels ?? [];
  const projects = projectsData?.linearProjects ?? [];
  const cycles = cyclesData?.linearCycles ?? [];
  const comments = commentsData?.linearComments ?? [];
  const subIssues = subIssuesData?.linearSubIssues ?? [];
  const relations = relationsData?.linearIssueRelations ?? [];

  const labelOptions: ComboboxOption[] = useMemo(() =>
    labels.map((l) => ({
      label: l.name ?? '',
      value: l.id ?? '',
      icon: <ColorDot color={l.color ?? ''} />,
    })),
    [labels],
  );

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleTitleSave = useCallback(async (title: string) => {
    await updateIssue({ variables: { id: issueId, input: { title } } });
  }, [updateIssue, issueId]);

  const handleFieldChange = useCallback(async (field: string, value: unknown) => {
    await updateIssue({ variables: { id: issueId, input: { [field]: value } } });
  }, [updateIssue, issueId]);

  const handleLabelsChange = useCallback(async (labelIds: string | string[]) => {
    const ids = Array.isArray(labelIds) ? labelIds : [labelIds];
    setOptimisticLabels(ids);
    pendingLabelUpdate.current = true;
    try {
      await updateIssue({ variables: { id: issueId, input: { labelIds: ids } } });
    } catch {
      setOptimisticLabels(null);
    } finally {
      pendingLabelUpdate.current = false;
      setOptimisticLabels(null);
    }
  }, [updateIssue, issueId]);

  const handleStartEditBody = useCallback(() => {
    setDraftBody(issue?.description ?? '');
    setEditingBody(true);
  }, [issue?.description]);

  const handleSaveBody = useCallback(async (body: string) => {
    await updateIssue({ variables: { id: issueId, input: { description: body } } });
    setEditingBody(false);
  }, [updateIssue, issueId]);

  const handleAddComment = useCallback(async () => {
    const body = commentBody.trim();
    if (!body) return;
    await addComment({ variables: { issueId, body } });
    setCommentBody('');
    refetchComments();
  }, [addComment, issueId, commentBody, refetchComments]);

  const handleDelete = useCallback(async () => {
    await deleteIssue({ variables: { id: issueId } });
    setDeleteDialogOpen(false);
    onClose?.();
  }, [deleteIssue, issueId, onClose]);

  const navigateToIssue = useCallback((targetId: string) => {
    const targetUri = `@vienna//linear_issue/${targetId}`;
    onNavigate?.(targetUri, 'linear_issue');
  }, [onNavigate]);

  // ── Loading / error states ─────────────────────────────────────────────
  if (loading && !issue) {
    return (
      <DrawerContainer title="Linear Issue">
        <DrawerBody>
          <div className="space-y-4 animate-pulse">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-5 w-64 bg-muted rounded" />
            <div className="h-20 w-full bg-muted rounded" />
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  if (error || !issue) {
    return (
      <DrawerContainer title="Linear Issue">
        <DrawerBody>
          <div className="flex flex-col items-center gap-2 py-8">
            <span className="text-sm text-muted-foreground">
              {error ? 'Failed to load issue' : 'Issue not found'}
            </span>
          </div>
        </DrawerBody>
      </DrawerContainer>
    );
  }

  const serverLabelIds = (issue.labels ?? []).map((l) => l.id).filter(Boolean);
  const currentLabelIds = optimisticLabels ?? serverLabelIds;
  const isSaving = updateLoading || commentLoading;

  // Group relations by type for display
  const relationGroups = new Map<string, typeof relations>();
  for (const rel of relations) {
    const type = rel.type ?? 'related';
    if (!relationGroups.has(type)) relationGroups.set(type, []);
    relationGroups.get(type)!.push(rel);
  }

  return (
    <DrawerContainer
      title={issue.title}
      headerActions={headerActions}
      footer={
        <DrawerPanelFooter>
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 size={12} className="mr-1" />
              Delete
            </Button>
            {issue.url && (
              <Button variant="outline" size="sm" asChild>
                <a href={issue.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={12} className="mr-1" />
                  Open in Linear
                </a>
              </Button>
            )}
          </div>
        </DrawerPanelFooter>
      }
    >
      <DrawerBody>
        <div data-slot="linear-issue-drawer" className="space-y-4">
          <SavingBar visible={isSaving} />

          {/* Header: identifier + status */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20 px-2 py-0.5 text-[11px] font-medium">
              {issue.identifier}
            </span>
            {issue.stateName && (
              <span className="text-xs text-muted-foreground">{issue.stateName}</span>
            )}
          </div>

          {/* Editable Title */}
          <InlineEdit
            value={issue.title ?? ''}
            onSave={handleTitleSave}
            disabled={updateLoading}
          />

          <Separator />

          {/* Properties */}
          <div className="space-y-1">
            <MetadataRow label="Status">
              <Select value={issue.stateId ?? ''} onValueChange={(v) => handleFieldChange('stateId', v)}>
                <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-1.5">
                        <ColorDot color={s.color} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MetadataRow>

            <MetadataRow label="Priority">
              <Select value={String(issue.priority ?? 0)} onValueChange={(v) => handleFieldChange('priority', Number(v))}>
                <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MetadataRow>

            <MetadataRow label="Assignee">
              <Select value={issue.assigneeId ?? NONE} onValueChange={(v) => handleFieldChange('assigneeId', v === NONE ? null : v)}>
                <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {members.filter((m) => m.active).map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MetadataRow>

            <MetadataRow label="Project">
              <Select value={issue.projectId ?? NONE} onValueChange={(v) => handleFieldChange('projectId', v === NONE ? null : v)}>
                <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MetadataRow>

            <MetadataRow label="Cycle">
              <Select value={issue.cycleId ?? NONE} onValueChange={(v) => handleFieldChange('cycleId', v === NONE ? null : v)}>
                <SelectTrigger className="h-6 w-auto min-w-[100px] text-xs"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name ?? `Cycle ${c.number}`}{c.isActive ? ' (active)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MetadataRow>

            <MetadataRow label="Estimate">
              <Select value={issue.estimate != null ? String(issue.estimate) : NONE} onValueChange={(v) => handleFieldChange('estimate', v === NONE ? null : Number(v))}>
                <SelectTrigger className="h-6 w-auto min-w-[60px] text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {ESTIMATE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </MetadataRow>

            <MetadataRow label="Due Date">
              <input
                type="date"
                value={issue.dueDate ?? ''}
                onChange={(e) => handleFieldChange('dueDate', e.target.value || null)}
                className="h-6 rounded border border-border bg-background px-2 text-xs"
              />
            </MetadataRow>

            {issue.createdAt && <MetadataRow label="Created">{formatRelative(issue.createdAt)}</MetadataRow>}
            {issue.updatedAt && <MetadataRow label="Updated">{formatRelative(issue.updatedAt)}</MetadataRow>}
          </div>

          {/* Labels */}
          <div>
            <span className="text-xs font-medium text-muted-foreground">Labels</span>
            <div className="mt-1">
              <Combobox
                multiple
                options={labelOptions}
                value={currentLabelIds}
                onValueChange={handleLabelsChange}
                placeholder="Add labels..."
                searchPlaceholder="Search labels..."
                emptyText="No labels found"
              />
            </div>
          </div>

          <Separator />

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Description</span>
              {!editingBody && (
                <Button variant="ghost" size="icon-xs" onClick={handleStartEditBody}>
                  <Pencil size={12} />
                </Button>
              )}
            </div>
            {editingBody ? (
              <MarkdownEditor
                value={draftBody}
                onChange={setDraftBody}
                onSave={handleSaveBody}
                onCancel={() => setEditingBody(false)}
                placeholder="Add a description..."
                size="sm"
              />
            ) : issue.description ? (
              <div className="rounded border border-border p-3">
                <Markdown content={issue.description} size="sm" />
              </div>
            ) : (
              <button
                type="button"
                className="w-full rounded border border-dashed border-border p-3 text-xs text-muted-foreground hover:border-foreground/30 transition-colors text-left"
                onClick={handleStartEditBody}
              >
                Add a description...
              </button>
            )}
          </div>

          {/* Sub-issues */}
          {subIssues.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-2 block">
                  Sub-issues ({subIssues.length})
                </span>
                <div className="space-y-1">
                  {subIssues.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className="flex items-center gap-2 w-full rounded px-2 py-1.5 text-left hover:bg-muted/50 transition-colors"
                      onClick={() => navigateToIssue(sub.id)}
                    >
                      <span className="text-[10px] text-muted-foreground font-mono">{sub.identifier}</span>
                      <span className="text-xs truncate flex-1">{sub.title}</span>
                      <span className="text-[10px] text-muted-foreground">{sub.stateName}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Relations */}
          {relations.length > 0 && (
            <>
              <Separator />
              <div>
                <span className="text-xs font-medium text-muted-foreground mb-2 block">
                  Relations ({relations.length})
                </span>
                {Array.from(relationGroups.entries()).map(([type, rels]) => (
                  <div key={type} className="mb-2">
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      {type.replace(/_/g, ' ')}
                    </span>
                    <div className="space-y-1 mt-1">
                      {rels.map((rel) => (
                        <button
                          key={rel.id}
                          type="button"
                          className="flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-muted/50 text-left transition-colors"
                          onClick={() => navigateToIssue(rel.relatedIssueId)}
                        >
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {rel.relatedIssueIdentifier}
                          </span>
                          <span className="text-xs truncate">{rel.relatedIssueTitle}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Comments */}
          <Separator />
          <div>
            <span className="text-xs font-medium text-muted-foreground mb-2 block">
              Comments{comments.length > 0 ? ` (${comments.length})` : ''}
            </span>

            {comments.length > 0 && (
              <div className="space-y-3 mb-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="rounded border border-border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">{comment.authorName ?? 'Unknown'}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {comment.createdAt ? formatRelative(comment.createdAt) : ''}
                      </span>
                    </div>
                    <Markdown content={comment.body} size="sm" />
                  </div>
                ))}
              </div>
            )}

            <Textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Leave a comment..."
              rows={3}
            />
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                disabled={!commentBody.trim() || commentLoading}
                onClick={handleAddComment}
              >
                {commentLoading ? 'Commenting...' : 'Comment'}
              </Button>
            </div>
          </div>
        </div>
      </DrawerBody>

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete issue"
        description={`Permanently delete "${issue.identifier}: ${issue.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </DrawerContainer>
  );
}
