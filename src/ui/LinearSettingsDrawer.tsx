/**
 * LinearSettingsDrawer — Settings panel for the Linear plugin.
 *
 * Combines credential management + team filter + issue filter settings.
 * Follows the same patterns as GitHubSettingsDrawer.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePluginQuery } from '@tryvienna/sdk/react';
import {
  ContentSection,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Input,
  Label,
  Checkbox,
} from '@tryvienna/ui';
import type { PluginHostApi, CanvasLogger, OAuthProviderStatusEntry } from '@tryvienna/sdk';
import { KeyRound, Check, Trash2, Eye, EyeOff, X, ExternalLink, Unplug } from 'lucide-react';
import { useLinearSettings, type LinearSettings } from './useLinearSettings';
import { GET_LINEAR_TEAMS } from '../client/operations';

// ─────────────────────────────────────────────────────────────────────────────
// Credential helpers
// ─────────────────────────────────────────────────────────────────────────────

const CREDENTIAL_LABELS: Record<string, string> = {
  api_token: 'API Key',
  linear_oauth_client_id: 'OAuth Client ID',
  linear_oauth_client_secret: 'OAuth Client Secret',
};

const OAUTH_CREDENTIAL_PATTERN = /oauth_client_(id|secret)$/;

function getCredentialLabel(key: string): string {
  if (CREDENTIAL_LABELS[key]) return CREDENTIAL_LABELS[key];
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// CredentialField
// ─────────────────────────────────────────────────────────────────────────────

function CredentialField({
  integrationId,
  credentialKey,
  isSet,
  hostApi,
  onUpdate,
}: {
  integrationId: string;
  credentialKey: string;
  isSet: boolean;
  hostApi: PluginHostApi;
  onUpdate: () => void;
}) {
  const label = getCredentialLabel(credentialKey);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await hostApi.setCredential(integrationId, credentialKey, value.trim());
      setValue('');
      setEditing(false);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }, [integrationId, credentialKey, value, hostApi, onUpdate]);

  const handleRemove = useCallback(async () => {
    setSaving(true);
    try {
      await hostApi.removeCredential(integrationId, credentialKey);
      onUpdate();
    } finally {
      setSaving(false);
    }
  }, [integrationId, credentialKey, hostApi, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setValue('');
  }, []);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound size={14} className="text-amber-400" />
          <Label className="text-xs font-medium">{label}</Label>
        </div>
        <div className="flex items-center gap-1">
          {isSet && !editing && (
            <>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                <Check size={10} />
                Set
              </span>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setEditing(true)}>
                <Eye size={12} />
              </Button>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={handleRemove} disabled={saving}>
                <Trash2 size={12} />
              </Button>
            </>
          )}
          {!isSet && !editing && (
            <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setEditing(true)}>
              Configure
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <div className="mt-2 flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={!showValue ? 'password' : 'text'}
              value={value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
              placeholder={isSet ? 'Enter new value to replace' : `Enter ${label.toLowerCase()}`}
              className="h-7 pr-8 text-xs"
              autoFocus
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-5 w-5 p-0"
              onClick={() => setShowValue(!showValue)}
            >
              {showValue ? <EyeOff size={12} /> : <Eye size={12} />}
            </Button>
          </div>
          <Button variant="default" size="sm" className="h-7 text-xs" onClick={handleSave} disabled={!value.trim() || saving}>
            Save
          </Button>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleCancel}>
            <X size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OAuthConnectButton
// ─────────────────────────────────────────────────────────────────────────────

function OAuthConnectButton({
  connected,
  loading,
  onConnect,
  onDisconnect,
}: {
  connected: boolean;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  if (connected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">Connected via OAuth</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs text-destructive"
          onClick={onDisconnect}
          disabled={loading}
        >
          <Unplug size={12} className="mr-1" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 w-full text-xs"
      onClick={onConnect}
      disabled={loading}
    >
      {loading ? (
        'Waiting for authorization...'
      ) : (
        <>
          <ExternalLink size={12} className="mr-1.5" />
          Connect with Linear
        </>
      )}
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_TYPE_OPTIONS = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'unstarted', label: 'Unstarted' },
  { value: 'started', label: 'Started' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ASSIGNMENT_OPTIONS: { value: LinearSettings['assignment']; label: string }[] = [
  { value: 'all', label: 'All issues' },
  { value: 'assigned_to_me', label: 'Assigned to me' },
  { value: 'created_by_me', label: 'Created by me' },
];

const GROUP_BY_OPTIONS: { value: LinearSettings['groupBy']; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'status', label: 'Status' },
  { value: 'priority', label: 'Priority' },
  { value: 'label', label: 'Label' },
  { value: 'project', label: 'Project' },
];

const LIMIT_OPTIONS = [10, 20, 50, 100];

// ─────────────────────────────────────────────────────────────────────────────
// Settings Drawer
// ─────────────────────────────────────────────────────────────────────────────

export function LinearSettingsDrawer({
  hostApi,
  logger,
}: {
  hostApi: PluginHostApi;
  logger: CanvasLogger;
}) {
  const { settings, updateSettings, resetSettings } = useLinearSettings();

  // ── Credential status ──────────────────────────────────────────────────
  const [credentials, setCredentials] = useState<Array<{ key: string; isSet: boolean }>>([]);
  const [credLoading, setCredLoading] = useState(true);

  const fetchCredentials = useCallback(async () => {
    try {
      const keys = await hostApi.getCredentialStatus('linear');
      setCredentials(keys);
      // Notify nav section to re-check auth status
      window.dispatchEvent(new CustomEvent('vienna-plugin:linear:settings-changed'));
    } catch (err) {
      logger.warn('Failed to fetch credential status', { error: String(err) });
    } finally {
      setCredLoading(false);
    }
  }, [hostApi, logger]);

  useEffect(() => { fetchCredentials(); }, [fetchCredentials]);

  // ── OAuth status ────────────────────────────────────────────────────────
  const [oauthProviders, setOauthProviders] = useState<OAuthProviderStatusEntry[]>([]);
  const [oauthLoading, setOauthLoading] = useState(false);

  const fetchOAuthStatus = useCallback(async () => {
    try {
      const providers = await hostApi.getOAuthStatus('linear');
      setOauthProviders(providers);
    } catch (err) {
      logger.warn('Failed to fetch OAuth status', { error: String(err) });
    }
  }, [hostApi, logger]);

  useEffect(() => { fetchOAuthStatus(); }, [fetchOAuthStatus]);

  const oauthConnected = oauthProviders.some((p) => p.connected);

  const oauthCredentials = useMemo(
    () => credentials.filter((k) => OAUTH_CREDENTIAL_PATTERN.test(k.key)),
    [credentials],
  );
  const apiCredentials = useMemo(
    () => credentials.filter((k) => !OAUTH_CREDENTIAL_PATTERN.test(k.key)),
    [credentials],
  );

  const handleOAuthConnect = useCallback(async () => {
    setOauthLoading(true);
    try {
      await hostApi.startOAuthFlow('linear', 'linear');
      // Poll for status
      const timeout = Date.now() + 5 * 60 * 1000;
      const poll = setInterval(async () => {
        if (Date.now() > timeout) {
          clearInterval(poll);
          setOauthLoading(false);
          return;
        }
        const providers = await hostApi.getOAuthStatus('linear');
        setOauthProviders(providers);
        if (providers.some((p) => p.connected)) {
          clearInterval(poll);
          setOauthLoading(false);
          fetchCredentials();
        }
      }, 2000);
    } catch (err) {
      logger.warn('OAuth flow failed', { error: String(err) });
      setOauthLoading(false);
    }
  }, [hostApi, logger, fetchCredentials]);

  const handleOAuthDisconnect = useCallback(async () => {
    setOauthLoading(true);
    try {
      await hostApi.revokeOAuthToken('linear', 'linear');
      await fetchOAuthStatus();
      fetchCredentials();
    } finally {
      setOauthLoading(false);
    }
  }, [hostApi, fetchOAuthStatus, fetchCredentials]);

  // ── Teams query ─────────────────────────────────────────────────────────
  const { data: teamsData } = usePluginQuery<{ linearTeams: Array<{ id: string; name: string; key: string }> }>(GET_LINEAR_TEAMS, {
    skip: credLoading || credentials.length === 0,
    fetchPolicy: 'cache-and-network',
  });
  const teams = teamsData?.linearTeams ?? [];

  // ── Status type toggle ─────────────────────────────────────────────────
  const handleStatusTypeToggle = (type: string) => {
    const current = settings.statusTypes;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    if (next.length > 0) {
      updateSettings({ statusTypes: next });
    }
  };

  return (
    <div className="space-y-4">
      {/* Authentication */}
      <ContentSection title="Authentication">
        <div className="space-y-2">
          {/* API Key */}
          {apiCredentials.map((cred) => (
            <CredentialField
              key={cred.key}
              integrationId="linear"
              credentialKey={cred.key}
              isSet={cred.isSet}
              hostApi={hostApi}
              onUpdate={fetchCredentials}
            />
          ))}

          {/* OAuth */}
          <OAuthConnectButton
            connected={oauthConnected}
            loading={oauthLoading}
            onConnect={handleOAuthConnect}
            onDisconnect={handleOAuthDisconnect}
          />

          {/* OAuth credentials (client ID/secret) */}
          {oauthCredentials.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[11px] text-muted-foreground">
                OAuth App Credentials (optional)
              </p>
              {oauthCredentials.map((cred) => (
                <CredentialField
                  key={cred.key}
                  integrationId="linear"
                  credentialKey={cred.key}
                  isSet={cred.isSet}
                  hostApi={hostApi}
                  onUpdate={fetchCredentials}
                />
              ))}
            </div>
          )}
        </div>
      </ContentSection>

      {/* Team Filter */}
      <ContentSection title="Team">
        <Select
          value={settings.teamId}
          onValueChange={(value) => updateSettings({ teamId: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All teams" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All teams</SelectItem>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.key} — {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ContentSection>

      {/* Assignment Filter */}
      <ContentSection title="Assignment">
        <div className="flex flex-col gap-1">
          {ASSIGNMENT_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={settings.assignment === opt.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateSettings({ assignment: opt.value })}
              className="justify-start"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </ContentSection>

      {/* Status Types */}
      <ContentSection title="Status types">
        <div className="flex flex-col gap-2">
          {STATUS_TYPE_OPTIONS.map((opt) => (
            <div key={opt.value} className="flex items-center gap-2">
              <Checkbox
                id={`status-${opt.value}`}
                checked={settings.statusTypes.includes(opt.value)}
                onCheckedChange={() => handleStatusTypeToggle(opt.value)}
              />
              <Label
                htmlFor={`status-${opt.value}`}
                className="text-[13px] cursor-pointer"
              >
                {opt.label}
              </Label>
            </div>
          ))}
        </div>
      </ContentSection>

      {/* Group By */}
      <ContentSection title="Group by">
        <div className="flex flex-wrap gap-1">
          {GROUP_BY_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={settings.groupBy === opt.value ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => updateSettings({ groupBy: opt.value })}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </ContentSection>

      {/* Issue Limit */}
      <ContentSection title="Issue limit">
        <Select
          value={String(settings.limit)}
          onValueChange={(value) => updateSettings({ limit: Number(value) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIMIT_OPTIONS.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n} issues
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ContentSection>

      {/* Reset */}
      <ContentSection>
        <Button variant="outline" size="sm" onClick={resetSettings} className="w-full">
          Reset to defaults
        </Button>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          Settings are saved automatically
        </p>
      </ContentSection>
    </div>
  );
}
