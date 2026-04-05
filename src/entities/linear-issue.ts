import { defineEntity } from '@tryvienna/sdk';
import { LINEAR_ENTITY_URI_SEGMENTS } from './uri';
import { LinearIssueEntityDrawer } from '../ui/LinearIssueEntityDrawer';

const LINEAR_ISSUE_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 12h4"/><path d="M10 16h4"/></svg>';

export const linearIssueEntity = defineEntity({
  type: 'linear_issue',
  name: 'Linear Issue',
  description: 'An issue from Linear project management',
  icon: { svg: LINEAR_ISSUE_SVG },
  source: 'integration',
  uri: [...LINEAR_ENTITY_URI_SEGMENTS],

  display: {
    emoji: '\u{1F4CB}',
    colors: { bg: '#5E6AD2', text: '#FFFFFF', border: '#4E5BBF' },
    description: 'Linear project management issues',
    outputFields: [
      { key: 'identifier', label: 'Identifier', metadataPath: 'identifier' },
      { key: 'status', label: 'Status', metadataPath: 'stateName' },
      { key: 'priority', label: 'Priority', metadataPath: 'priorityLabel' },
      { key: 'assignee', label: 'Assignee', metadataPath: 'assigneeName' },
      { key: 'project', label: 'Project', metadataPath: 'projectName' },
      { key: 'labels', label: 'Labels', metadataPath: 'labelNames' },
      { key: 'dueDate', label: 'Due Date', metadataPath: 'dueDate' },
      { key: 'url', label: 'URL', metadataPath: 'url' },
    ],
  },

  cache: { ttl: 30_000, maxSize: 200 },

  ui: { drawer: LinearIssueEntityDrawer },
});
