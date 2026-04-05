/**
 * useLinearSettings — Persistent settings for the Linear nav section.
 *
 * Settings are stored in localStorage, scoped to the plugin.
 * Uses CustomEvent for cross-component synchronization (nav <-> settings drawer).
 */

import { useState, useEffect, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface LinearSettings {
  /** Team UUID to filter by, or 'all' */
  teamId: string;
  /** Assignment filter mode */
  assignment: 'all' | 'assigned_to_me' | 'created_by_me';
  /** Status types to include */
  statusTypes: string[];
  /** How to group issues in the nav */
  groupBy: 'none' | 'status' | 'priority' | 'label' | 'project';
  /** Max items to fetch */
  limit: number;
}

export const DEFAULT_SETTINGS: LinearSettings = {
  teamId: 'all',
  assignment: 'all',
  statusTypes: ['started', 'unstarted'],
  groupBy: 'none',
  limit: 20,
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'vienna-plugin:linear:settings';
const CHANGE_EVENT = 'vienna-plugin:linear:settings-changed';

function loadSettings(): LinearSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: LinearSettings): void {
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

export function useLinearSettings() {
  const [settings, setSettingsState] = useState(loadSettings);

  useEffect(() => {
    const handler = () => setSettingsState(loadSettings());
    window.addEventListener(CHANGE_EVENT, handler);
    return () => window.removeEventListener(CHANGE_EVENT, handler);
  }, []);

  const updateSettings = useCallback((patch: Partial<LinearSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings };
}
