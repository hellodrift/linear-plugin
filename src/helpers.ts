/**
 * Linear plugin helpers — shape interfaces and converters.
 *
 * Pure functions used by both api.ts and schema.ts.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Priority labels
// ─────────────────────────────────────────────────────────────────────────────

export const PRIORITY_LABELS: Record<number, string> = {
  0: 'No priority',
  1: 'Urgent',
  2: 'High',
  3: 'Normal',
  4: 'Low',
};

// ─────────────────────────────────────────────────────────────────────────────
// Shape interfaces — match what api.ts functions return
// ─────────────────────────────────────────────────────────────────────────────

export interface LinearIssueLabelShape {
  id: string;
  name: string;
  color: string;
}

export interface LinearIssueShape {
  id: string;
  title: string;
  identifier: string;
  status?: string;
  stateId?: string;
  stateName?: string;
  priority: number;
  priorityLabel: string;
  assigneeId?: string;
  assigneeName?: string;
  teamId?: string;
  teamName?: string;
  teamKey?: string;
  labels?: LinearIssueLabelShape[];
  labelNames?: string;
  projectId?: string;
  projectName?: string;
  cycleId?: string;
  cycleName?: string;
  estimate?: number;
  dueDate?: string;
  parentId?: string;
  description?: string;
  url?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LinearWorkflowStateShape {
  id: string;
  name: string;
  color: string;
  type: string;
}

export interface LinearUserShape {
  id: string;
  name: string;
  displayName?: string | null;
  email?: string | null;
  active: boolean;
}

export interface LinearTeamShape {
  id: string;
  name: string;
  key: string;
}

export interface LinearProjectShape {
  id: string;
  name: string;
  status?: string | null;
}

export interface LinearCycleShape {
  id: string;
  name?: string | null;
  number: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
}

export interface LinearCommentShape {
  id: string;
  body: string;
  authorName?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface LinearIssueRelationShape {
  id: string;
  type: string;
  relatedIssueId: string;
  relatedIssueIdentifier?: string | null;
  relatedIssueTitle?: string | null;
}

export interface LinearSubIssueShape {
  id: string;
  title: string;
  identifier?: string | null;
  status?: string | null;
  stateName?: string | null;
  priority: number;
  priorityLabel: string;
  assigneeName?: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Issue converter — resolves @linear/sdk lazy relations
// ─────────────────────────────────────────────────────────────────────────────

export async function issueToShape(issue: any): Promise<LinearIssueShape> {
  const state = issue._state ? await issue.state : undefined;

  let assigneeName: string | undefined;
  if (issue._assignee) {
    try {
      const assignee = await issue.assignee;
      assigneeName = assignee?.name ?? assignee?.displayName;
    } catch {
      // assignee resolution failed
    }
  }

  let teamName: string | undefined;
  let teamKey: string | undefined;
  if (issue._team) {
    try {
      const team = await issue.team;
      teamName = team?.name;
      teamKey = team?.key;
    } catch {
      // team resolution failed
    }
  }

  let labels: LinearIssueLabelShape[] | undefined;
  let labelNames: string | undefined;
  try {
    const labelsConn = await issue.labels();
    if (labelsConn?.nodes?.length) {
      labels = labelsConn.nodes.map((l: any) => ({
        id: l.id,
        name: l.name,
        color: l.color ?? '',
      }));
      labelNames = (labels as LinearIssueLabelShape[]).map((l) => l.name).join(', ');
    }
  } catch {
    // labels resolution failed
  }

  let projectId: string | undefined;
  let projectName: string | undefined;
  try {
    const project = await issue.project;
    if (project) {
      projectId = project.id;
      projectName = project.name;
    }
  } catch {
    // project resolution failed
  }

  let cycleId: string | undefined;
  let cycleName: string | undefined;
  try {
    const cycle = await issue.cycle;
    if (cycle) {
      cycleId = cycle.id;
      cycleName = cycle.name ?? cycle.number?.toString();
    }
  } catch {
    // cycle resolution failed
  }

  let parentId: string | undefined;
  try {
    const parent = await issue.parent;
    if (parent) {
      parentId = parent.id;
    }
  } catch {
    // parent resolution failed
  }

  const priority = issue.priority ?? 0;

  return {
    id: issue.id,
    title: issue.title,
    identifier: issue.identifier,
    status: state?.name?.toLowerCase().replace(/\s+/g, '_'),
    stateId: state?.id,
    stateName: state?.name,
    priority,
    priorityLabel: PRIORITY_LABELS[priority] ?? 'Unknown',
    assigneeId: issue._assignee?.id,
    assigneeName,
    teamId: issue._team?.id,
    teamName,
    teamKey,
    labels,
    labelNames,
    projectId,
    projectName,
    cycleId,
    cycleName,
    estimate: issue.estimate ?? undefined,
    dueDate: issue.dueDate ?? undefined,
    parentId,
    description: issue.description,
    url: issue.url,
    createdAt: issue.createdAt?.toISOString?.() ?? issue.createdAt,
    updatedAt: issue.updatedAt?.toISOString?.() ?? issue.updatedAt,
  };
}
