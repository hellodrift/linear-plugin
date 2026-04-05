/**
 * useLinearFeedSettings — Persistent settings for the Linear feed canvas.
 *
 * Separate from useLinearSettings (nav sidebar) so feed and sidebar
 * filters don't interfere with each other.
 */

import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LinearFeedSettings {
  /** Status types to include (multi-select) */
  statusTypes: string[];
  /** Assignment filter mode */
  assignee: 'all' | 'assigned_to_me' | 'created_by_me';
  /** Priority filter: 'all' or a priority number as string */
  priority: string;
  /** Sort field */
  sortBy: 'created' | 'updated' | 'priority';
}

export const DEFAULT_FEED_SETTINGS: LinearFeedSettings = {
  statusTypes: ['backlog'],
  assignee: 'assigned_to_me',
  priority: 'all',
  sortBy: 'created',
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vienna-plugin:linear:feed-settings';
const CHANGE_EVENT = 'vienna-plugin:linear:feed-settings-changed';

function loadSettings(): LinearFeedSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FEED_SETTINGS;
    return { ...DEFAULT_FEED_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_FEED_SETTINGS;
  }
}

function saveSettings(settings: LinearFeedSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // localStorage unavailable
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useLinearFeedSettings() {
  const [settings, setSettingsState] = useState(loadSettings);

  useEffect(() => {
    const handler = () => setSettingsState(loadSettings());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const updateSettings = useCallback((patch: Partial<LinearFeedSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, updateSettings };
}
