import { describe, it, expect } from 'vitest';
import { linearIssueEntity, LINEAR_ENTITY_URI_SEGMENTS, LINEAR_URI_PATH } from '../entities';

describe('linearIssueEntity', () => {
  it('has the correct type', () => {
    expect(linearIssueEntity.type).toBe('linear_issue');
  });

  it('has the correct name', () => {
    expect(linearIssueEntity.name).toBe('Linear Issue');
  });

  it('has source set to integration', () => {
    expect(linearIssueEntity.source).toBe('integration');
  });

  it('has display colors', () => {
    expect(linearIssueEntity.display!.colors.bg).toBe('#5E6AD2');
    expect(linearIssueEntity.display!.colors.text).toBe('#FFFFFF');
    expect(linearIssueEntity.display!.colors.border).toBe('#4E5BBF');
  });

  it('has cache configuration', () => {
    expect(linearIssueEntity.cache).toEqual({ ttl: 30_000, maxSize: 200 });
  });

  it('has output fields', () => {
    const fieldKeys = linearIssueEntity.display!.outputFields?.map((f) => f.key);
    expect(fieldKeys).toContain('identifier');
    expect(fieldKeys).toContain('status');
    expect(fieldKeys).toContain('priority');
    expect(fieldKeys).toContain('assignee');
  });
});

describe('LINEAR_ENTITY_URI_SEGMENTS', () => {
  it('has a single "id" segment', () => {
    expect(LINEAR_ENTITY_URI_SEGMENTS).toEqual(['id']);
  });
});

describe('LINEAR_URI_PATH', () => {
  it('has segments matching the URI segments', () => {
    expect(LINEAR_URI_PATH.segments).toEqual(['id']);
  });
});
