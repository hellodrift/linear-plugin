/**
 * GraphQL operations for the Linear plugin UI.
 *
 * Import `gql` directly from graphql-tag (a platform external).
 * The SDK's re-export from @tryvienna/sdk doesn't survive the CJS eval
 * context used by the plugin evaluator.
 *
 * Once codegen is set up, switch to `graphql` from './generated/gql'
 * for full TypedDocumentNode support.
 */

import { gql } from 'graphql-tag';

// ── Nav section ────────────────────────────────────────────────────────────

export const GET_LINEAR_ISSUES = gql`
  query GetLinearIssues($limit: Int, $teamId: ID, $assignmentFilter: String, $statusTypes: [String!]) {
    linearIssues(limit: $limit, teamId: $teamId, assignmentFilter: $assignmentFilter, statusTypes: $statusTypes) {
      id
      title
      identifier
      status
      stateName
      priority
      priorityLabel
      assigneeName
      teamKey
      url
      labels { name color }
      projectName
    }
  }
`;

// ── Feed canvas ───────────────────────────────────────────────────────────

export const GET_LINEAR_FEED_ISSUES = gql`
  query GetLinearFeedIssues($limit: Int, $teamId: ID, $assignmentFilter: String, $statusTypes: [String!]) {
    linearIssues(limit: $limit, teamId: $teamId, assignmentFilter: $assignmentFilter, statusTypes: $statusTypes) {
      id
      title
      identifier
      status
      stateName
      priority
      priorityLabel
      assigneeName
      teamKey
      url
      createdAt
      updatedAt
      labels { name color }
      projectName
    }
  }
`;

// ── Settings drawer ────────────────────────────────────────────────────────

export const GET_LINEAR_TEAMS = gql`
  query GetLinearTeams {
    linearTeams { id name key }
  }
`;

// ── Entity drawer — issue detail ───────────────────────────────────────────

export const GET_LINEAR_ISSUE = gql`
  query GetLinearIssue($id: ID!) {
    linearIssue(id: $id) {
      id
      title
      identifier
      status
      stateId
      stateName
      priority
      priorityLabel
      assigneeId
      assigneeName
      teamId
      teamName
      teamKey
      labels { id name color }
      labelNames
      projectId
      projectName
      cycleId
      cycleName
      estimate
      dueDate
      parentId
      description
      url
      createdAt
      updatedAt
    }
  }
`;

// ── Entity drawer — reference data queries ─────────────────────────────────

export const GET_LINEAR_WORKFLOW_STATES = gql`
  query GetLinearWorkflowStates($teamId: ID!) {
    linearWorkflowStates(teamId: $teamId) { id name color type }
  }
`;

export const GET_LINEAR_TEAM_MEMBERS = gql`
  query GetLinearTeamMembers($teamId: ID) {
    linearTeamMembers(teamId: $teamId) { id name displayName email active }
  }
`;

export const GET_LINEAR_LABELS = gql`
  query GetLinearLabels($teamId: ID) {
    linearLabels(teamId: $teamId) { id name color }
  }
`;

export const GET_LINEAR_PROJECTS = gql`
  query GetLinearProjects($teamId: ID) {
    linearProjects(teamId: $teamId) { id name status }
  }
`;

export const GET_LINEAR_CYCLES = gql`
  query GetLinearCycles($teamId: ID!) {
    linearCycles(teamId: $teamId) { id name number startsAt endsAt isActive }
  }
`;

export const GET_LINEAR_COMMENTS = gql`
  query GetLinearComments($issueId: ID!) {
    linearComments(issueId: $issueId) { id body authorName createdAt updatedAt }
  }
`;

export const GET_LINEAR_SUB_ISSUES = gql`
  query GetLinearSubIssues($issueId: ID!) {
    linearSubIssues(issueId: $issueId) {
      id title identifier status stateName priority priorityLabel assigneeName
    }
  }
`;

export const GET_LINEAR_ISSUE_RELATIONS = gql`
  query GetLinearIssueRelations($issueId: ID!) {
    linearIssueRelations(issueId: $issueId) {
      id type relatedIssueId relatedIssueIdentifier relatedIssueTitle
    }
  }
`;

// ── Mutations ──────────────────────────────────────────────────────────────

export const CREATE_LINEAR_ISSUE = gql`
  mutation CreateLinearIssue($input: CreateLinearIssueInput!) {
    createLinearIssue(input: $input) {
      id title identifier stateId stateName priority priorityLabel
      assigneeId assigneeName teamId teamKey
      labels { id name color }
      projectId projectName cycleId cycleName
      estimate dueDate description url
    }
  }
`;

export const UPDATE_LINEAR_ISSUE = gql`
  mutation UpdateLinearIssue($id: ID!, $input: UpdateLinearIssueInput!) {
    updateLinearIssue(id: $id, input: $input) {
      id title identifier stateId stateName priority priorityLabel
      assigneeId assigneeName teamId teamKey
      labels { id name color }
      labelNames projectId projectName cycleId cycleName
      estimate dueDate description
    }
  }
`;

export const DELETE_LINEAR_ISSUE = gql`
  mutation DeleteLinearIssue($id: ID!) {
    deleteLinearIssue(id: $id) { success message }
  }
`;

export const ADD_LINEAR_COMMENT = gql`
  mutation AddLinearComment($issueId: ID!, $body: String!) {
    addLinearComment(issueId: $issueId, body: $body) { success message }
  }
`;

export const CREATE_LINEAR_LABEL = gql`
  mutation CreateLinearLabel($name: String!, $color: String, $teamId: ID) {
    createLinearLabel(name: $name, color: $color, teamId: $teamId) { success message }
  }
`;

// ── Vienna workstream entity linking ──────────────────────────────────────

export const LINK_WORKSTREAM_ENTITY = gql`
  mutation LinkWorkstreamEntity($workstreamId: ID!, $entityUri: String!, $entityType: String!, $entityTitle: String) {
    linkWorkstreamEntity(workstreamId: $workstreamId, entityUri: $entityUri, entityType: $entityType, entityTitle: $entityTitle) {
      workstream { id }
    }
  }
`;
