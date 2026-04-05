/**
 * LinearNavSection — Nav sidebar canvas for the Linear plugin.
 *
 * Shows a list of Linear issues with filtering and grouping.
 * Settings button opens the LinearSettingsDrawer.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePluginQuery } from '@tryvienna/sdk/react';
import {
  NavSection,
  NavItem,
  NavSettingsButton,
  NavHeaderActions,
} from '@tryvienna/ui';
import type { NavSidebarCanvasProps } from '@tryvienna/sdk';
import { Settings } from 'lucide-react';
import { useLinearSettings } from './useLinearSettings';
import { GET_LINEAR_ISSUES } from '../client/operations';

// ─────────────────────────────────────────────────────────────────────────────
// Logo (same path as LinearFeed)
// ─────────────────────────────────────────────────────────────────────────────

const LINEAR_LOGO_PATH =
  'M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.08887215.5599.28957165.7606L52.3503 99.7085c.2007.2007.4773.3075.7606.2896 2.3692-.1476 4.6938-.46 6.9624-.9259.7645-.157 1.0301-1.0963.4782-1.6481L2.57595 39.4485c-.55186-.5519-1.49117-.2863-1.648174.4782-.465915 2.2686-.77832 4.5932-.92588465 6.9624ZM4.21093 29.7054c-.16649.3738-.08169.8106.20765 1.1l64.77602 64.776c.2894.2894.7262.3742 1.1.2077 1.7861-.7956 3.5171-1.6927 5.1855-2.684.5521-.328.6373-1.0867.1832-1.5407L8.43566 24.3367c-.45409-.4541-1.21271-.3689-1.54074.1832-.99132 1.6684-1.88843 3.3994-2.68399 5.1855ZM12.6587 18.074c-.3701-.3701-.393-.9637-.0443-1.3541C21.7795 6.45931 35.1114 0 49.9519 0 77.5927 0 100 22.4073 100 50.0481c0 14.8405-6.4593 28.1724-16.7199 37.3375-.3903.3487-.984.3258-1.3542-.0443L12.6587 18.074Z';

function LinearLogo({ size = 12 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="currentColor"
      width={size}
      height={size}
    >
      <path d={LINEAR_LOGO_PATH} />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types & helpers
// ─────────────────────────────────────────────────────────────────────────────

interface LinearIssueNav {
  id: string;
  title: string;
  identifier: string;
  status: string;
  stateName: string;
  priority: number;
  priorityLabel: string;
  assigneeName?: string;
  teamKey?: string;
  labels?: { name: string; color: string }[];
  projectName?: string;
}

const priorityColors: Record<number, string> = {
  1: 'var(--status-error)',
  2: 'var(--status-warning)',
  3: 'var(--text-secondary)',
  4: 'var(--text-muted)',
};

function groupIssues(issues: LinearIssueNav[], groupBy: string): Map<string, LinearIssueNav[]> {
  const groups = new Map<string, LinearIssueNav[]>();
  for (const issue of issues) {
    let key: string;
    switch (groupBy) {
      case 'status':
        key = issue.stateName || 'Unknown';
        break;
      case 'priority':
        key = issue.priorityLabel || 'No priority';
        break;
      case 'label':
        key = issue.labels?.[0]?.name || 'No Label';
        break;
      case 'project':
        key = issue.projectName || 'No Project';
        break;
      default:
        key = '';
    }
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(issue);
  }
  return groups;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function IssueNavItem({ issue, onSelect }: { issue: LinearIssueNav; onSelect: () => void }) {
  return (
    <NavItem
      item={{
        id: issue.id,
        label: issue.title || '(No title)',
        variant: 'item' as const,
        meta: (
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            {issue.priority > 0 && (
              <span style={{ color: priorityColors[issue.priority] || 'var(--text-muted)', fontWeight: 600 }}>
                P{issue.priority}
              </span>
            )}
            <span>{issue.identifier}</span>
          </span>
        ),
      }}
      onSelect={onSelect}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function LinearNavSection({
  pluginId,
  openPluginDrawer,
  openEntityDrawer,
  hostApi,
}: NavSidebarCanvasProps) {
  const { settings } = useLinearSettings();

  // Track whether credentials are configured. Starts false and
  // is checked on mount + whenever the settings drawer fires a change event.
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const [keys, oauth] = await Promise.all([
          hostApi.getCredentialStatus('linear'),
          hostApi.getOAuthStatus('linear'),
        ]);
        if (cancelled) return;
        const hasKey = keys.some((k) => k.isSet);
        const hasOAuth = oauth.some((p) => p.connected);
        setIsAuthenticated(hasKey || hasOAuth);
      } catch {
        // ignore
      }
    };
    check();
    // Re-check when settings drawer signals a credential change
    const handler = () => { check(); };
    window.addEventListener('vienna-plugin:linear:settings-changed', handler);
    return () => { cancelled = true; window.removeEventListener('vienna-plugin:linear:settings-changed', handler); };
  }, [hostApi]);

  // Fetch issues — resolver returns [] when not authenticated.
  // No polling once authenticated; re-fetch triggered by Apollo cache / settings changes.
  const { data, loading, error } = usePluginQuery<{ linearIssues: LinearIssueNav[] }>(GET_LINEAR_ISSUES, {
    variables: {
      limit: settings.limit,
      teamId: settings.teamId === 'all' ? undefined : settings.teamId,
      assignmentFilter: settings.assignment === 'all' ? undefined : settings.assignment,
      statusTypes: settings.statusTypes,
    },
    skip: !isAuthenticated,
    fetchPolicy: 'cache-and-network',
  });

  const issues: LinearIssueNav[] = data?.linearIssues ?? [];

  const handleIssueSelect = useCallback((issue: LinearIssueNav) => {
    openEntityDrawer(`@vienna//linear_issue/${issue.id}`);
  }, [openEntityDrawer]);

  const sectionData = {
    id: `plugin-${pluginId}-nav`,
    label: `Linear${issues.length ? ` (${issues.length})` : ''}`,
    icon: <LinearLogo size={12} />,
    items: [],
    isLoading: isAuthenticated && loading && !data,
    hoverActions: (
      <NavHeaderActions>
        <NavSettingsButton
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            openPluginDrawer({ view: 'settings' });
          }}
          ariaLabel="Linear settings"
        />
      </NavHeaderActions>
    ),
    emptyState: !isAuthenticated
      ? 'Add an API key in settings to get started'
      : error && !data
        ? error.message
        : 'No issues found',
  };

  // Not configured — show setup prompt
  if (!isAuthenticated) {
    return (
      <NavSection section={sectionData} defaultExpanded>
        <NavItem
          item={{
            id: 'setup',
            label: 'Open Settings to configure',
            variant: 'item',
            icon: <Settings size={14} />,
          }}
          onSelect={() => openPluginDrawer({ view: 'settings' })}
        />
      </NavSection>
    );
  }

  // Grouped view
  if (settings.groupBy !== 'none' && issues.length > 0) {
    const groups = groupIssues(issues, settings.groupBy);

    return (
      <NavSection section={sectionData} defaultExpanded>
        {Array.from(groups.entries()).map(([groupName, groupIssues]) => (
          <div key={groupName}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 600,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '8px 12px 2px',
              }}
            >
              {groupName}
            </div>
            {groupIssues.map((issue) => (
              <IssueNavItem
                key={issue.id}
                issue={issue}
                onSelect={() => handleIssueSelect(issue)}
              />
            ))}
          </div>
        ))}
      </NavSection>
    );
  }

  // Flat view
  return (
    <NavSection section={sectionData} defaultExpanded>
      {issues.map((issue) => (
        <IssueNavItem
          key={issue.id}
          issue={issue}
          onSelect={() => handleIssueSelect(issue)}
        />
      ))}
    </NavSection>
  );
}
