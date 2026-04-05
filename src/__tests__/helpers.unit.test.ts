import { describe, it, expect } from 'vitest';
import { PRIORITY_LABELS, issueToShape } from '../helpers';

describe('PRIORITY_LABELS', () => {
  it('maps all 5 priority levels', () => {
    expect(PRIORITY_LABELS[0]).toBe('No priority');
    expect(PRIORITY_LABELS[1]).toBe('Urgent');
    expect(PRIORITY_LABELS[2]).toBe('High');
    expect(PRIORITY_LABELS[3]).toBe('Normal');
    expect(PRIORITY_LABELS[4]).toBe('Low');
  });
});

describe('issueToShape', () => {
  it('converts a minimal issue to a shape', async () => {
    const mockIssue = {
      id: 'issue-1',
      title: 'Test Issue',
      identifier: 'ENG-42',
      priority: 2,
      description: 'A test issue',
      url: 'https://linear.app/team/issue/ENG-42',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      dueDate: null,
      estimate: null,
      // No lazy relations
      labels: () => Promise.resolve({ nodes: [] }),
    };

    const shape = await issueToShape(mockIssue);

    expect(shape.id).toBe('issue-1');
    expect(shape.title).toBe('Test Issue');
    expect(shape.identifier).toBe('ENG-42');
    expect(shape.priority).toBe(2);
    expect(shape.priorityLabel).toBe('High');
    expect(shape.description).toBe('A test issue');
    expect(shape.url).toBe('https://linear.app/team/issue/ENG-42');
  });

  it('resolves lazy-loaded state', async () => {
    const mockIssue = {
      id: 'issue-2',
      title: 'Issue with state',
      identifier: 'ENG-43',
      priority: 3,
      _state: { id: 'state-1' },
      state: Promise.resolve({ id: 'state-1', name: 'In Progress' }),
      labels: () => Promise.resolve({ nodes: [] }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const shape = await issueToShape(mockIssue);

    expect(shape.stateId).toBe('state-1');
    expect(shape.stateName).toBe('In Progress');
    expect(shape.status).toBe('in_progress');
  });

  it('resolves lazy-loaded assignee', async () => {
    const mockIssue = {
      id: 'issue-3',
      title: 'Assigned issue',
      identifier: 'ENG-44',
      priority: 0,
      _assignee: { id: 'user-1' },
      assignee: Promise.resolve({ name: 'John Doe', displayName: 'johndoe' }),
      labels: () => Promise.resolve({ nodes: [] }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const shape = await issueToShape(mockIssue);

    expect(shape.assigneeId).toBe('user-1');
    expect(shape.assigneeName).toBe('John Doe');
  });

  it('resolves labels', async () => {
    const mockIssue = {
      id: 'issue-4',
      title: 'Labeled issue',
      identifier: 'ENG-45',
      priority: 1,
      labels: () => Promise.resolve({
        nodes: [
          { id: 'label-1', name: 'Bug', color: '#ff0000' },
          { id: 'label-2', name: 'P1', color: '#ff8800' },
        ],
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const shape = await issueToShape(mockIssue);

    expect(shape.labels).toHaveLength(2);
    expect(shape.labels![0].name).toBe('Bug');
    expect(shape.labelNames).toBe('Bug, P1');
  });

  it('handles failed relation resolution gracefully', async () => {
    const mockIssue = {
      id: 'issue-5',
      title: 'Issue with failures',
      identifier: 'ENG-46',
      priority: 0,
      _assignee: { id: 'bad-user' },
      get assignee() { return Promise.reject(new Error('Not found')); },
      _team: { id: 'bad-team' },
      get team() { return Promise.reject(new Error('Not found')); },
      labels: () => Promise.reject(new Error('Labels failed')),
      get project() { return Promise.reject(new Error('Not found')); },
      get cycle() { return Promise.reject(new Error('Not found')); },
      get parent() { return Promise.reject(new Error('Not found')); },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const shape = await issueToShape(mockIssue);

    // Should not throw, and missing fields should be undefined
    expect(shape.id).toBe('issue-5');
    expect(shape.assigneeName).toBeUndefined();
    expect(shape.teamName).toBeUndefined();
    expect(shape.labels).toBeUndefined();
    expect(shape.projectId).toBeUndefined();
    expect(shape.cycleId).toBeUndefined();
    expect(shape.parentId).toBeUndefined();
  });

  it('falls back to "Unknown" for unmapped priority', async () => {
    const mockIssue = {
      id: 'issue-6',
      title: 'Weird priority',
      identifier: 'ENG-47',
      priority: 99,
      labels: () => Promise.resolve({ nodes: [] }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const shape = await issueToShape(mockIssue);
    expect(shape.priorityLabel).toBe('Unknown');
  });
});
