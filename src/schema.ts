/**
 * Linear integration GraphQL schema registration.
 *
 * Registers all Linear-specific GraphQL types, queries, and mutations
 * on the Pothos builder. Called via the integration's `schema` callback
 * during plugin loading.
 *
 * @module plugin-linear/schema
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
// NOTE: Pothos builder types don't survive .d.ts boundaries. Builder callbacks
// use `any` by design. The eslint-disable above covers the type assertions.

import { GraphQLError } from 'graphql';
import { buildEntityURI } from '@tryvienna/sdk';
import type { BaseEntity } from '@tryvienna/sdk';
import { linearIssueEntity } from './entities';
import { linearIntegration } from './integration';
import type { LinearClient } from '@linear/sdk';
import * as api from './api';
import {
  type LinearIssueShape,
  type LinearIssueLabelShape,
  type LinearWorkflowStateShape,
  type LinearUserShape,
  type LinearTeamShape,
  type LinearProjectShape,
  type LinearCycleShape,
  type LinearCommentShape,
  type LinearIssueRelationShape,
  type LinearSubIssueShape,
} from './helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function getLinearClient(ctx: any): Promise<LinearClient> {
  const client = await ctx.getIntegrationClient?.('linear');
  if (!client) {
    throw new GraphQLError('Linear integration is not available. Connect Linear in Settings.', {
      extensions: { code: 'INTEGRATION_NOT_AVAILABLE' },
    });
  }
  return client as LinearClient;
}

/** Returns null instead of throwing when no client is configured. */
async function getLinearClientOrNull(ctx: any): Promise<LinearClient | null> {
  const client = await ctx.getIntegrationClient?.('linear');
  return (client as LinearClient) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Schema Registration
// ─────────────────────────────────────────────────────────────────────────────

export function registerLinearSchema(rawBuilder: unknown): void {
  const builder = rawBuilder as any;

  // ── Object Types ─────────────────────────────────────────────────────────

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearIssueLabelRef = builder.objectRef<LinearIssueLabelShape>('LinearIssueLabel');
  builder.objectType(LinearIssueLabelRef, {
    description: 'A label on a Linear issue',
    fields: (t) => ({
      id: t.exposeString('id'),
      name: t.exposeString('name'),
      color: t.exposeString('color'),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearIssueRef = builder.objectRef<LinearIssueShape>('LinearIssue');
  builder.objectType(LinearIssueRef, {
    description: 'A Linear issue',
    fields: (t) => ({
      id: t.id({ resolve: (issue) => issue.id }),
      title: t.exposeString('title'),
      identifier: t.exposeString('identifier'),
      status: t.exposeString('status', { nullable: true }),
      stateId: t.exposeString('stateId', { nullable: true }),
      stateName: t.exposeString('stateName', { nullable: true }),
      priority: t.exposeInt('priority'),
      priorityLabel: t.exposeString('priorityLabel', { nullable: true }),
      assigneeId: t.exposeString('assigneeId', { nullable: true }),
      assigneeName: t.exposeString('assigneeName', { nullable: true }),
      teamId: t.exposeString('teamId', { nullable: true }),
      teamName: t.exposeString('teamName', { nullable: true }),
      teamKey: t.exposeString('teamKey', { nullable: true }),
      labels: t.field({ type: [LinearIssueLabelRef], nullable: true, resolve: (issue) => issue.labels ?? null }),
      labelNames: t.exposeString('labelNames', { nullable: true }),
      projectId: t.exposeString('projectId', { nullable: true }),
      projectName: t.exposeString('projectName', { nullable: true }),
      cycleId: t.exposeString('cycleId', { nullable: true }),
      cycleName: t.exposeString('cycleName', { nullable: true }),
      estimate: t.exposeInt('estimate', { nullable: true }),
      dueDate: t.exposeString('dueDate', { nullable: true }),
      parentId: t.exposeString('parentId', { nullable: true }),
      description: t.exposeString('description', { nullable: true }),
      url: t.exposeString('url', { nullable: true }),
      createdAt: t.exposeString('createdAt', { nullable: true }),
      updatedAt: t.exposeString('updatedAt', { nullable: true }),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearWorkflowStateRef = builder.objectRef<LinearWorkflowStateShape>('LinearWorkflowState');
  builder.objectType(LinearWorkflowStateRef, {
    description: 'A workflow state in a Linear team',
    fields: (t) => ({
      id: t.exposeString('id'),
      name: t.exposeString('name'),
      color: t.exposeString('color'),
      type: t.exposeString('type'),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearUserRef = builder.objectRef<LinearUserShape>('LinearUser');
  builder.objectType(LinearUserRef, {
    description: 'A Linear user',
    fields: (t) => ({
      id: t.exposeString('id'),
      name: t.exposeString('name'),
      displayName: t.exposeString('displayName', { nullable: true }),
      email: t.exposeString('email', { nullable: true }),
      active: t.exposeBoolean('active'),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearTeamRef = builder.objectRef<LinearTeamShape>('LinearTeam');
  builder.objectType(LinearTeamRef, {
    description: 'A Linear team',
    fields: (t) => ({
      id: t.exposeString('id'),
      name: t.exposeString('name'),
      key: t.exposeString('key'),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearProjectRef = builder.objectRef<LinearProjectShape>('LinearProject');
  builder.objectType(LinearProjectRef, {
    description: 'A Linear project',
    fields: (t) => ({
      id: t.exposeString('id'),
      name: t.exposeString('name'),
      status: t.exposeString('status', { nullable: true }),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearCycleRef = builder.objectRef<LinearCycleShape>('LinearCycle');
  builder.objectType(LinearCycleRef, {
    description: 'A Linear sprint cycle',
    fields: (t) => ({
      id: t.exposeString('id'),
      name: t.exposeString('name', { nullable: true }),
      number: t.exposeInt('number'),
      startsAt: t.exposeString('startsAt', { nullable: true }),
      endsAt: t.exposeString('endsAt', { nullable: true }),
      isActive: t.exposeBoolean('isActive'),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearCommentRef = builder.objectRef<LinearCommentShape>('LinearComment');
  builder.objectType(LinearCommentRef, {
    description: 'A comment on a Linear issue',
    fields: (t) => ({
      id: t.exposeString('id'),
      body: t.exposeString('body'),
      authorName: t.exposeString('authorName', { nullable: true }),
      createdAt: t.exposeString('createdAt'),
      updatedAt: t.exposeString('updatedAt', { nullable: true }),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearIssueRelationRef = builder.objectRef<LinearIssueRelationShape>('LinearIssueRelation');
  builder.objectType(LinearIssueRelationRef, {
    description: 'A relation between Linear issues',
    fields: (t) => ({
      id: t.exposeString('id'),
      type: t.exposeString('type'),
      relatedIssueId: t.exposeString('relatedIssueId'),
      relatedIssueIdentifier: t.exposeString('relatedIssueIdentifier', { nullable: true }),
      relatedIssueTitle: t.exposeString('relatedIssueTitle', { nullable: true }),
    }),
  });

  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearSubIssueRef = builder.objectRef<LinearSubIssueShape>('LinearSubIssue');
  builder.objectType(LinearSubIssueRef, {
    description: 'A sub-issue of a Linear issue',
    fields: (t) => ({
      id: t.exposeString('id'),
      title: t.exposeString('title'),
      identifier: t.exposeString('identifier', { nullable: true }),
      status: t.exposeString('status', { nullable: true }),
      stateName: t.exposeString('stateName', { nullable: true }),
      priority: t.exposeInt('priority'),
      priorityLabel: t.exposeString('priorityLabel'),
      assigneeName: t.exposeString('assigneeName', { nullable: true }),
    }),
  });

  // Mutation result type for operations that don't return an issue
  // @ts-expect-error — builder type args not available across .d.ts boundary
  const LinearMutationResultRef = builder.objectRef<{ success: boolean; message: string }>('LinearMutationResult');
  builder.objectType(LinearMutationResultRef, {
    description: 'Result of a Linear mutation',
    fields: (t) => ({
      success: t.exposeBoolean('success'),
      message: t.exposeString('message'),
    }),
  });

  // ── Input Types ──────────────────────────────────────────────────────────

  const CreateLinearIssueInput = builder.inputType('CreateLinearIssueInput', {
    fields: (t) => ({
      title: t.string({ required: true }),
      teamId: t.string({ required: true, description: 'Team UUID' }),
      description: t.string({ description: 'Issue description (markdown)' }),
      priority: t.int({ description: 'Priority: 0=none, 1=urgent, 2=high, 3=normal, 4=low' }),
      assigneeId: t.string({ description: 'User UUID to assign' }),
      stateId: t.string({ description: 'Workflow state UUID' }),
      labelIds: t.stringList({ description: 'Label UUIDs to attach' }),
      projectId: t.string({ description: 'Project UUID' }),
      cycleId: t.string({ description: 'Cycle/sprint UUID' }),
      parentId: t.string({ description: 'Parent issue UUID for sub-issues' }),
      estimate: t.int({ description: 'Complexity estimate points' }),
      dueDate: t.string({ description: 'Due date in YYYY-MM-DD format' }),
    }),
  });

  const UpdateLinearIssueInput = builder.inputType('UpdateLinearIssueInput', {
    fields: (t) => ({
      title: t.string(),
      description: t.string(),
      priority: t.int(),
      assigneeId: t.string({ description: 'User UUID, or null to unassign' }),
      stateId: t.string({ description: 'Workflow state UUID' }),
      labelIds: t.stringList({ description: 'Replace ALL labels with these IDs' }),
      projectId: t.string({ description: 'Project UUID, or null to remove' }),
      cycleId: t.string({ description: 'Cycle UUID, or null to remove' }),
      estimate: t.int({ description: 'Estimate points, or null to clear' }),
      dueDate: t.string({ description: 'Due date YYYY-MM-DD, or null to clear' }),
      teamId: t.string({ description: 'Move issue to a different team' }),
      parentId: t.string({ description: 'Parent issue UUID' }),
    }),
  });

  // ── Queries ──────────────────────────────────────────────────────────────

  builder.queryFields((t) => ({
    linearIssue: t.field({
      type: LinearIssueRef,
      nullable: true,
      description: 'Get a single Linear issue by ID',
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.getIssue(client, { id: String(args.id) });
      },
    }),

    linearIssues: t.field({
      type: [LinearIssueRef],
      description: 'List Linear issues with filters. Returns empty array if not authenticated.',
      args: {
        query: t.arg.string(),
        teamId: t.arg.id(),
        limit: t.arg.int({ defaultValue: 20 }),
        assignmentFilter: t.arg.string({ description: '"all", "assigned_to_me", or "created_by_me"' }),
        statusTypes: t.arg.stringList({ description: 'Filter by state types: backlog, unstarted, started, completed, cancelled' }),
      },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClientOrNull(ctx);
        if (!client) return [];
        return api.listIssues(client, {
          query: args.query ?? undefined,
          teamId: args.teamId ? String(args.teamId) : undefined,
          limit: args.limit ?? 20,
          assignmentFilter: args.assignmentFilter ?? undefined,
          statusTypes: args.statusTypes ?? undefined,
        });
      },
    }),

    linearWorkflowStates: t.field({
      type: [LinearWorkflowStateRef],
      description: 'List workflow states for a team',
      args: { teamId: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.listWorkflowStates(client, { teamId: String(args.teamId) });
      },
    }),

    linearTeamMembers: t.field({
      type: [LinearUserRef],
      description: 'List team members or all workspace users',
      args: { teamId: t.arg.id() },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.listTeamMembers(client, { teamId: args.teamId ? String(args.teamId) : undefined });
      },
    }),

    linearLabels: t.field({
      type: [LinearIssueLabelRef],
      description: 'List labels (workspace-wide or team-specific)',
      args: { teamId: t.arg.id() },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.listLabels(client, { teamId: args.teamId ? String(args.teamId) : undefined });
      },
    }),

    linearTeams: t.field({
      type: [LinearTeamRef],
      description: 'List all Linear teams in the workspace. Returns empty array if not authenticated.',
      resolve: async (_root, _args, ctx) => {
        const client = await getLinearClientOrNull(ctx);
        if (!client) return [];
        return api.listTeams(client);
      },
    }),

    linearProjects: t.field({
      type: [LinearProjectRef],
      description: 'List projects (workspace-wide or team-specific)',
      args: { teamId: t.arg.id() },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.listProjects(client, { teamId: args.teamId ? String(args.teamId) : undefined });
      },
    }),

    linearCycles: t.field({
      type: [LinearCycleRef],
      description: 'List sprint cycles for a team',
      args: { teamId: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.listCycles(client, { teamId: String(args.teamId) });
      },
    }),

    linearComments: t.field({
      type: [LinearCommentRef],
      description: 'List comments on an issue',
      args: { issueId: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.listComments(client, { issueId: String(args.issueId) });
      },
    }),

    linearSubIssues: t.field({
      type: [LinearSubIssueRef],
      description: 'List sub-issues of an issue',
      args: { issueId: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.listSubIssues(client, { issueId: String(args.issueId) });
      },
    }),

    linearIssueRelations: t.field({
      type: [LinearIssueRelationRef],
      description: 'List relations for an issue',
      args: { issueId: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.listIssueRelations(client, { issueId: String(args.issueId) });
      },
    }),
  }));

  // ── Mutations ────────────────────────────────────────────────────────────

  builder.mutationFields((t) => ({
    createLinearIssue: t.field({
      type: LinearIssueRef,
      nullable: true,
      description: 'Create a new Linear issue',
      args: { input: t.arg({ type: CreateLinearIssueInput, required: true }) },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.createIssue(client, {
          title: args.input.title,
          teamId: args.input.teamId,
          description: args.input.description ?? undefined,
          priority: args.input.priority ?? undefined,
          assigneeId: args.input.assigneeId ?? undefined,
          stateId: args.input.stateId ?? undefined,
          labelIds: args.input.labelIds ?? undefined,
          projectId: args.input.projectId ?? undefined,
          cycleId: args.input.cycleId ?? undefined,
          parentId: args.input.parentId ?? undefined,
          estimate: args.input.estimate ?? undefined,
          dueDate: args.input.dueDate ?? undefined,
        });
      },
    }),

    updateLinearIssue: t.field({
      type: LinearIssueRef,
      nullable: true,
      description: 'Update an existing Linear issue',
      args: {
        id: t.arg.id({ required: true }),
        input: t.arg({ type: UpdateLinearIssueInput, required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.updateIssue(client, {
          id: String(args.id),
          title: args.input.title ?? undefined,
          description: args.input.description ?? undefined,
          priority: args.input.priority ?? undefined,
          assigneeId: args.input.assigneeId,
          stateId: args.input.stateId ?? undefined,
          labelIds: args.input.labelIds ?? undefined,
          projectId: args.input.projectId,
          cycleId: args.input.cycleId,
          estimate: args.input.estimate,
          dueDate: args.input.dueDate,
          teamId: args.input.teamId ?? undefined,
          parentId: args.input.parentId,
        });
      },
    }),

    deleteLinearIssue: t.field({
      type: LinearMutationResultRef,
      description: 'Delete a Linear issue permanently',
      args: { id: t.arg.id({ required: true }) },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.deleteIssue(client, { id: String(args.id) });
      },
    }),

    addLinearComment: t.field({
      type: LinearMutationResultRef,
      description: 'Add a comment to a Linear issue',
      args: {
        issueId: t.arg.id({ required: true }),
        body: t.arg.string({ required: true }),
      },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.addComment(client, {
          issueId: String(args.issueId),
          body: args.body,
        });
      },
    }),

    createLinearLabel: t.field({
      type: LinearMutationResultRef,
      description: 'Create a new issue label',
      args: {
        name: t.arg.string({ required: true }),
        color: t.arg.string(),
        teamId: t.arg.id(),
      },
      resolve: async (_root, args, ctx) => {
        const client = await getLinearClient(ctx);
        return api.createLabel(client, {
          name: args.name,
          color: args.color ?? undefined,
          teamId: args.teamId ? String(args.teamId) : undefined,
        });
      },
    }),
  }));

  // ── Entity Handler Registration ──────────────────────────────────────────

  const issueUriPath = { segments: ['id'] as const };

  builder.registerEntityHandlers(linearIssueEntity, {
    integrations: { linear: linearIntegration },
    resolve: async (id, ctx) => {
      const client = ctx.integrations.linear.client as LinearClient;
      if (!client) return null;
      try {
        const issue = await api.getIssue(client, { id: id['id'] });
        if (!issue) return null;
        return {
          id: issue.id,
          type: 'linear_issue',
          uri: buildEntityURI('linear_issue', id, issueUriPath),
          title: issue.title,
          description: `${issue.identifier} — ${issue.stateName ?? 'Unknown'}`,
          createdAt: issue.createdAt ? new Date(issue.createdAt).getTime() : undefined,
          updatedAt: issue.updatedAt ? new Date(issue.updatedAt).getTime() : undefined,
        } as BaseEntity;
      } catch {
        return null;
      }
    },
    search: async (query, ctx) => {
      const client = ctx.integrations.linear.client as LinearClient;
      if (!client) return [];
      try {
        const results = await api.searchIssues(client, {
          query: query.query || '',
          limit: query.limit ?? 20,
        });
        return results.map((issue) => ({
          id: issue.id,
          type: 'linear_issue',
          uri: buildEntityURI('linear_issue', { id: issue.id }, issueUriPath),
          title: issue.title,
          description: `${issue.identifier} — ${issue.stateName ?? ''}`,
          createdAt: issue.createdAt ? new Date(issue.createdAt).getTime() : undefined,
          updatedAt: issue.updatedAt ? new Date(issue.updatedAt).getTime() : undefined,
        } as BaseEntity));
      } catch {
        return [];
      }
    },
    resolveContext: async (entity) => {
      return `### Linear Issue: ${entity.title}\n- **URI:** ${entity.uri}`;
    },
  });
}
