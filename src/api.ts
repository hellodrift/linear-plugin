/**
 * Linear API wrapper functions.
 *
 * Standalone async functions wrapping the @linear/sdk client.
 * Each function takes a LinearClient instance and returns shaped data.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { GraphQLError } from 'graphql';
import type { LinearClient } from '@linear/sdk';
import {
  PRIORITY_LABELS,
  issueToShape,
  type LinearIssueShape,
  type LinearWorkflowStateShape,
  type LinearUserShape,
  type LinearTeamShape,
  type LinearProjectShape,
  type LinearCycleShape,
  type LinearCommentShape,
  type LinearIssueRelationShape,
  type LinearSubIssueShape,
  type LinearIssueLabelShape,
} from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Error handling
// ─────────────────────────────────────────────────────────────────────────────

function wrapLinearError(err: unknown, context: string): never {
  if (err instanceof GraphQLError) throw err;
  if (err instanceof Error) {
    throw new GraphQLError(`Linear API error: ${err.message}`, {
      extensions: { code: 'LINEAR_API_ERROR', context },
    });
  }
  throw err;
}

// ─────────────────────────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getIssue(
  client: LinearClient,
  input: { id: string },
): Promise<LinearIssueShape | null> {
  try {
    const issue = await client.issue(input.id);
    return await issueToShape(issue);
  } catch (err) {
    wrapLinearError(err, 'getIssue');
  }
}

export async function listIssues(
  client: LinearClient,
  input: {
    query?: string;
    teamId?: string;
    limit?: number;
    assignmentFilter?: string;
    statusTypes?: string[];
  },
): Promise<LinearIssueShape[]> {
  try {
    const filter: Record<string, unknown> = {};
    if (input.query && input.query !== '*') {
      filter.title = { containsIgnoreCase: input.query };
    }
    if (input.teamId) {
      filter.team = { id: { eq: input.teamId } };
    }
    if (input.assignmentFilter === 'assigned_to_me') {
      filter.assignee = { isMe: { eq: true } };
    } else if (input.assignmentFilter === 'created_by_me') {
      filter.creator = { isMe: { eq: true } };
    }
    if (input.statusTypes?.length) {
      filter.state = { type: { in: input.statusTypes } };
    }
    const result = await client.issues({
      first: input.limit ?? 20,
      filter: Object.keys(filter).length > 0 ? filter : undefined,
    });
    return await Promise.all((result.nodes ?? []).map(issueToShape));
  } catch (err) {
    wrapLinearError(err, 'listIssues');
  }
}

export async function searchIssues(
  client: LinearClient,
  input: { query: string; limit?: number },
): Promise<LinearIssueShape[]> {
  try {
    const result = await client.searchIssues(input.query, {
      first: input.limit ?? 20,
    });
    return await Promise.all((result.nodes ?? []).map(issueToShape));
  } catch (err) {
    wrapLinearError(err, 'searchIssues');
  }
}

export async function listWorkflowStates(
  client: LinearClient,
  input: { teamId: string },
): Promise<LinearWorkflowStateShape[]> {
  try {
    const team = await client.team(input.teamId);
    const states = await team.states();
    const typeOrder: Record<string, number> = {
      backlog: 0,
      unstarted: 1,
      started: 2,
      completed: 3,
      cancelled: 4,
    };
    return (states.nodes ?? [])
      .map((s: any) => ({
        id: s.id,
        name: s.name,
        color: s.color ?? '',
        type: s.type ?? '',
      }))
      .sort(
        (a: LinearWorkflowStateShape, b: LinearWorkflowStateShape) =>
          (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99),
      );
  } catch (err) {
    wrapLinearError(err, 'listWorkflowStates');
  }
}

export async function listTeamMembers(
  client: LinearClient,
  input: { teamId?: string },
): Promise<LinearUserShape[]> {
  try {
    let members;
    if (input.teamId) {
      const team = await client.team(input.teamId);
      members = await team.members();
    } else {
      members = await client.users();
    }
    return (members.nodes ?? []).map((u: any) => ({
      id: u.id,
      name: u.name,
      displayName: u.displayName ?? null,
      email: u.email ?? null,
      active: u.active ?? true,
    }));
  } catch (err) {
    wrapLinearError(err, 'listTeamMembers');
  }
}

export async function listLabels(
  client: LinearClient,
  input: { teamId?: string },
): Promise<LinearIssueLabelShape[]> {
  try {
    let labels;
    if (input.teamId) {
      const team = await client.team(input.teamId);
      labels = await team.labels();
    } else {
      labels = await client.issueLabels();
    }
    return (labels.nodes ?? []).map((l: any) => ({
      id: l.id,
      name: l.name,
      color: l.color ?? '',
    }));
  } catch (err) {
    wrapLinearError(err, 'listLabels');
  }
}

export async function listTeams(
  client: LinearClient,
): Promise<LinearTeamShape[]> {
  try {
    const teams = await client.teams();
    return (teams.nodes ?? []).map((t: any) => ({
      id: t.id,
      name: t.name,
      key: t.key,
    }));
  } catch (err) {
    wrapLinearError(err, 'listTeams');
  }
}

export async function listProjects(
  client: LinearClient,
  input: { teamId?: string },
): Promise<LinearProjectShape[]> {
  try {
    let projects;
    if (input.teamId) {
      const team = await client.team(input.teamId);
      projects = await team.projects();
    } else {
      projects = await client.projects();
    }
    return (projects.nodes ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.state ?? null,
    }));
  } catch (err) {
    wrapLinearError(err, 'listProjects');
  }
}

export async function listCycles(
  client: LinearClient,
  input: { teamId: string },
): Promise<LinearCycleShape[]> {
  try {
    const team = await client.team(input.teamId);
    const cycles = await team.cycles();
    const now = new Date();
    return (cycles.nodes ?? []).map((c: any) => ({
      id: c.id,
      name: c.name ?? null,
      number: c.number ?? 0,
      startsAt: c.startsAt?.toISOString?.() ?? c.startsAt ?? null,
      endsAt: c.endsAt?.toISOString?.() ?? c.endsAt ?? null,
      isActive:
        c.startsAt && c.endsAt
          ? new Date(c.startsAt) <= now && now <= new Date(c.endsAt)
          : false,
    }));
  } catch (err) {
    wrapLinearError(err, 'listCycles');
  }
}

export async function listComments(
  client: LinearClient,
  input: { issueId: string },
): Promise<LinearCommentShape[]> {
  try {
    const issue = await client.issue(input.issueId);
    const comments = await issue.comments();
    return await Promise.all(
      (comments.nodes ?? []).map(async (c: any) => {
        let authorName: string | undefined;
        try {
          const user = await c.user;
          authorName = user?.name ?? user?.displayName;
        } catch {
          // author resolution failed
        }
        return {
          id: c.id,
          body: c.body ?? '',
          authorName: authorName ?? null,
          createdAt: c.createdAt?.toISOString?.() ?? c.createdAt ?? '',
          updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt ?? null,
        };
      }),
    );
  } catch (err) {
    wrapLinearError(err, 'listComments');
  }
}

export async function listSubIssues(
  client: LinearClient,
  input: { issueId: string },
): Promise<LinearSubIssueShape[]> {
  try {
    const issue = await client.issue(input.issueId);
    const children = await issue.children();
    return await Promise.all(
      (children.nodes ?? []).map(async (child: any) => {
        let stateName: string | undefined;
        let status: string | undefined;
        try {
          const state = await child.state;
          stateName = state?.name;
          status = state?.name?.toLowerCase().replace(/\s+/g, '_');
        } catch {
          // state resolution failed
        }
        let assigneeName: string | undefined;
        try {
          const assignee = await child.assignee;
          assigneeName = assignee?.name ?? assignee?.displayName;
        } catch {
          // assignee resolution failed
        }
        const priority = child.priority ?? 0;
        return {
          id: child.id,
          title: child.title,
          identifier: child.identifier ?? null,
          status: status ?? null,
          stateName: stateName ?? null,
          priority,
          priorityLabel: PRIORITY_LABELS[priority] ?? 'Unknown',
          assigneeName: assigneeName ?? null,
        };
      }),
    );
  } catch (err) {
    wrapLinearError(err, 'listSubIssues');
  }
}

export async function listIssueRelations(
  client: LinearClient,
  input: { issueId: string },
): Promise<LinearIssueRelationShape[]> {
  try {
    const issue = await client.issue(input.issueId);
    const relations = await issue.relations();
    return await Promise.all(
      (relations.nodes ?? []).map(async (r: any) => {
        let relatedIssueIdentifier: string | undefined;
        let relatedIssueTitle: string | undefined;
        try {
          const related = await r.relatedIssue;
          relatedIssueIdentifier = related?.identifier;
          relatedIssueTitle = related?.title;
        } catch {
          // related issue resolution failed
        }
        return {
          id: r.id,
          type: r.type ?? '',
          relatedIssueId: r._relatedIssue?.id ?? '',
          relatedIssueIdentifier: relatedIssueIdentifier ?? null,
          relatedIssueTitle: relatedIssueTitle ?? null,
        };
      }),
    );
  } catch (err) {
    wrapLinearError(err, 'listIssueRelations');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateIssueInput {
  title: string;
  teamId: string;
  description?: string;
  priority?: number;
  assigneeId?: string;
  stateId?: string;
  labelIds?: string[];
  projectId?: string;
  cycleId?: string;
  parentId?: string;
  estimate?: number;
  dueDate?: string;
}

export async function createIssue(
  client: LinearClient,
  input: CreateIssueInput,
): Promise<LinearIssueShape> {
  try {
    const payload = await client.createIssue({
      title: input.title,
      teamId: input.teamId,
      description: input.description,
      priority: input.priority,
      assigneeId: input.assigneeId,
      stateId: input.stateId,
      labelIds: input.labelIds,
      projectId: input.projectId,
      cycleId: input.cycleId,
      parentId: input.parentId,
      estimate: input.estimate,
      dueDate: input.dueDate,
    });
    const issue = await payload.issue;
    if (!issue) {
      throw new GraphQLError('Issue creation returned no result', {
        extensions: { code: 'LINEAR_API_ERROR', context: 'createIssue' },
      });
    }
    return await issueToShape(issue);
  } catch (err) {
    wrapLinearError(err, 'createIssue');
  }
}

export interface UpdateIssueInput {
  title?: string;
  description?: string;
  priority?: number;
  assigneeId?: string | null;
  stateId?: string;
  labelIds?: string[];
  projectId?: string | null;
  cycleId?: string | null;
  estimate?: number | null;
  dueDate?: string | null;
  teamId?: string;
  parentId?: string | null;
}

export async function updateIssue(
  client: LinearClient,
  input: { id: string } & UpdateIssueInput,
): Promise<LinearIssueShape> {
  try {
    const { id, ...fields } = input;
    const updateData: Record<string, unknown> = {};
    if (fields.title !== undefined) updateData.title = fields.title;
    if (fields.description !== undefined) updateData.description = fields.description;
    if (fields.priority !== undefined) updateData.priority = fields.priority;
    if (fields.assigneeId !== undefined) updateData.assigneeId = fields.assigneeId;
    if (fields.stateId !== undefined) updateData.stateId = fields.stateId;
    if (fields.labelIds !== undefined) updateData.labelIds = fields.labelIds;
    if (fields.projectId !== undefined) updateData.projectId = fields.projectId;
    if (fields.cycleId !== undefined) updateData.cycleId = fields.cycleId;
    if (fields.estimate !== undefined) updateData.estimate = fields.estimate;
    if (fields.dueDate !== undefined) updateData.dueDate = fields.dueDate;
    if (fields.teamId !== undefined) updateData.teamId = fields.teamId;
    if (fields.parentId !== undefined) updateData.parentId = fields.parentId;

    const payload = await client.updateIssue(id, updateData);
    const issue = await payload.issue;
    if (!issue) {
      throw new GraphQLError('Issue update returned no result', {
        extensions: { code: 'LINEAR_API_ERROR', context: 'updateIssue' },
      });
    }
    return await issueToShape(issue);
  } catch (err) {
    wrapLinearError(err, 'updateIssue');
  }
}

export async function deleteIssue(
  client: LinearClient,
  input: { id: string },
): Promise<{ success: boolean; message: string }> {
  try {
    const payload = await client.deleteIssue(input.id);
    return {
      success: payload.success,
      message: payload.success
        ? `Deleted issue ${input.id}`
        : `Failed to delete issue ${input.id}`,
    };
  } catch (err) {
    wrapLinearError(err, 'deleteIssue');
  }
}

export async function addComment(
  client: LinearClient,
  input: { issueId: string; body: string },
): Promise<{ success: boolean; message: string }> {
  try {
    const payload = await client.createComment({
      issueId: input.issueId,
      body: input.body,
    });
    const comment = await payload.comment;
    return {
      success: true,
      message: comment
        ? 'Added comment to issue'
        : 'Comment created but no result returned',
    };
  } catch (err) {
    wrapLinearError(err, 'addComment');
  }
}

export async function createLabel(
  client: LinearClient,
  input: { name: string; color?: string; teamId?: string },
): Promise<{ success: boolean; message: string }> {
  try {
    const createInput: { name: string; color?: string; teamId?: string } = { name: input.name };
    if (input.color) createInput.color = input.color;
    if (input.teamId) createInput.teamId = input.teamId;
    const payload = await client.createIssueLabel(createInput);
    const label = await payload.issueLabel;
    return {
      success: true,
      message: label
        ? `Created label "${label.name}"`
        : `Created label "${input.name}"`,
    };
  } catch (err) {
    wrapLinearError(err, 'createLabel');
  }
}
