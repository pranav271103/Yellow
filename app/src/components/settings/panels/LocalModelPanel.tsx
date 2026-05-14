import { useCallback, useEffect, useMemo, useState } from 'react';

import { triggerLocalAiAssetBootstrap } from '../../../utils/localAiBootstrap';
import {
  formatBytes,
  formatEta,
  progressFromDownloads,
  progressFromStatus,
} from '../../../utils/localAiHelpers';
import {
  type ApplyPresetResult,
  type ClientConfig,
  type LocalAiDownloadsProgress,
  type LocalAiStatus,
  type ModelRoute,
  openhumanGetClientConfig,
  openhumanGetConfig,
  openhumanLocalAiApplyPreset,
  openhumanLocalAiDownload,
  openhumanLocalAiDownloadAllAssets,
  openhumanLocalAiDownloadsProgress,
  openhumanLocalAiPresets,
  openhumanLocalAiStatus,
  openhumanUpdateLocalAiSettings,
  openhumanUpdateModelSettings,
  type PresetsResponse,
} from '../../../utils/tauriCommands';
import SettingsHeader from '../components/SettingsHeader';
import { useSettingsNavigation } from '../hooks/useSettingsNavigation';
import DeviceCapabilitySection from './local-model/DeviceCapabilitySection';

const KEY_PLACEHOLDER = '••••••••••••••••';
const ROLE_HINTS = ['reasoning', 'agentic', 'coding', 'summarization'] as const;
type RoleHint = (typeof ROLE_HINTS)[number];

const ROLE_LABELS: Record<RoleHint, { label: string; help: string }> = {
  reasoning: { label: 'Reasoning', help: 'Deep thinking and planning.' },
  agentic: { label: 'Agentic', help: 'Tool use and sub-agents.' },
  coding: { label: 'Coding', help: 'Code generation.' },
  summarization: { label: 'Summarization', help: 'Fast responses.' },
};

type RoleModels = Record<RoleHint, string>;
const EMPTY_ROLE_MODELS: RoleModels = { reasoning: '', agentic: '', coding: '', summarization: '' };

const formatRamGb = (bytes: number): string => {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 10 ? `${Math.round(gb)} GB` : `${gb.toFixed(1)} GB`;
};

const LocalModelPanel = () => {
  const { navigateBack, navigateToSettings, breadcrumbs } = useSettingsNavigation();
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('cloud');

  // --- Local AI State ---
  const [status, setStatus] = useState<LocalAiStatus | null>(null);
  const [downloads, setDownloads] = useState<LocalAiDownloadsProgress | null>(null);
  const [statusError, setStatusError] = useState<string>('');
  const [isTriggeringDownload, setIsTriggeringDownload] = useState(false);
  const [bootstrapMessage, setBootstrapMessage] = useState<string>('');
  const [presetsData, setPresetsData] = useState<PresetsResponse | null>(null);
  const [presetsLoading, setPresetsLoading] = useState(true);
  const [presetError, setPresetError] = useState('');
  const [presetSuccess, setPresetSuccess] = useState<ApplyPresetResult | null>(null);

  // --- Cloud AI State ---
  const [client, setClient] = useState<ClientConfig | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyDirty, setApiKeyDirty] = useState(false);
  const [apiUrlDirty, setApiUrlDirty] = useState(false);
  const [roleModels, setRoleModels] = useState<RoleModels>(EMPTY_ROLE_MODELS);
  const [roleModelsDirty, setRoleModelsDirty] = useState(false);
  const [temp, setTemp] = useState(0.7);
  const [savingCloud, setSavingCloud] = useState(false);
  const [cloudStatus, setCloudStatus] = useState({ kind: 'idle', message: '' });

  const [usageFlags, setUsageFlags] = useState({
    runtime_enabled: false,
    usage_embeddings: false,
    usage_heartbeat: false,
    usage_learning_reflection: false,
    usage_subconscious: false,
  });
  const [usageSaving, setUsageSaving] = useState(false);

  const progress = useMemo(() => {
    const downloadProgress = progressFromDownloads(downloads);
    if (downloadProgress != null) return downloadProgress;
    return progressFromStatus(status);
  }, [downloads, status]);

  const currentState = downloads?.state ?? status?.state;
  const runtimeEnabled = usageFlags.runtime_enabled;
  const isInstalling = currentState === 'installing';
  const isIndeterminateDownload =
    isInstalling ||
    (currentState === 'downloading' &&
      typeof downloads?.progress !== 'number' &&
      typeof status?.download_progress !== 'number');
  const downloadedBytes = downloads?.downloaded_bytes ?? status?.downloaded_bytes;
  const totalBytes = downloads?.total_bytes ?? status?.total_bytes;
  const speedBps = downloads?.speed_bps ?? status?.download_speed_bps;
  const etaSeconds = downloads?.eta_seconds ?? status?.eta_seconds;

  const loadLocal = async () => {
    try {
      const [statusResponse, downloadsResponse, presets, snap] = await Promise.all([
        openhumanLocalAiStatus(),
        openhumanLocalAiDownloadsProgress(),
        openhumanLocalAiPresets(),
        openhumanGetConfig(),
      ]);
      setStatus(statusResponse.result);
      setDownloads(downloadsResponse.result);
      setPresetsData(presets);
      
      const localAi = (snap.result?.config?.local_ai ?? {}) as any;
      const usage = (localAi.usage ?? {}) as any;
      setUsageFlags({
        runtime_enabled: Boolean(localAi.runtime_enabled),
        usage_embeddings: Boolean(usage.embeddings),
        usage_heartbeat: Boolean(usage.heartbeat),
        usage_learning_reflection: Boolean(usage.learning_reflection),
        usage_subconscious: Boolean(usage.subconscious),
      });
      setPresetsLoading(false);
    } catch (err) {
      console.error('Failed to load local AI status', err);
    }
  };

  const loadCloud = useCallback(async () => {
    try {
      const response = await openhumanGetClientConfig();
      const config = response.result;
      setClient(config);
      setApiUrl(config.api_url ?? '');
      setTemp(0.7); // Default
      setLoadedCloud(true);
    } catch (err) {
      console.error('Failed to load cloud config', err);
    }
  }, []);

  const [loadedCloud, setLoadedCloud] = useState(false);

  useEffect(() => {
    void loadLocal();
    void loadCloud();
    const timer = window.setInterval(loadLocal, 5000);
    return () => window.clearInterval(timer);
  }, [loadCloud]);

  const handleSaveCloud = async () => {
    setSavingCloud(true);
    setCloudStatus({ kind: 'idle', message: '' });
    try {
      const routes: ModelRoute[] = roleModelsDirty 
        ? ROLE_HINTS.flatMap(hint => {
            const model = roleModels[hint].trim();
            return model ? [{ hint, model }] : [];
          })
        : [];

      await openhumanUpdateModelSettings({
        api_url: apiUrlDirty ? apiUrl : undefined,
        api_key: apiKeyDirty ? apiKey : undefined,
        default_temperature: temp,
        model_routes: roleModelsDirty ? routes : undefined,
      });
      setCloudStatus({ kind: 'ok', message: 'Cloud settings saved.' });
      void loadCloud();
    } catch (err) {
      setCloudStatus({ kind: 'error', message: 'Failed to save cloud settings.' });
    } finally {
      setSavingCloud(false);
    }
  };

  const triggerDownload = async (force: boolean) => {
    if (!runtimeEnabled) return;
    setIsTriggeringDownload(true);
    try {
      await openhumanLocalAiDownload(force);
      await openhumanLocalAiDownloadAllAssets(force);
      setBootstrapMessage(force ? 'Re-bootstrap complete' : 'Models verified');
      setTimeout(() => setBootstrapMessage(''), 3000);
    } catch (err) {
      setStatusError('Download failed');
    } finally {
      setIsTriggeringDownload(false);
    }
  };

  const updateUsage = async (patch: Partial<typeof usageFlags>) => {
    const next = { ...usageFlags, ...patch };
    setUsageFlags(next);
    setUsageSaving(true);
    try {
      await openhumanUpdateLocalAiSettings(patch);
    } catch (err) {
      void loadLocal();
    } finally {
      setUsageSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <SettingsHeader
        title="AI & Models"
        showBackButton={true}
        onBack={navigateBack}
        breadcrumbs={breadcrumbs}
      />

      {/* Tabs */}
      <div className="flex border-b border-stone-200 px-4">
        <button
          onClick={() => setActiveTab('cloud')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'cloud'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}>
          Cloud (NVIDIA/OpenAI)
        </button>
        <button
          onClick={() => setActiveTab('local')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'local'
              ? 'border-primary-500 text-primary-600'
              : 'border-transparent text-stone-500 hover:text-stone-700'
          }`}>
          Local (Ollama)
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            <section className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
                  Inference Endpoint
                </label>
                <input
                  type="url"
                  value={apiUrl}
                  onChange={e => { setApiUrl(e.target.value); setApiUrlDirty(true); }}
                  placeholder="https://integrate.api.nvidia.com/v1"
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setApiKeyDirty(true); }}
                  placeholder={client?.api_key_set ? KEY_PLACEHOLDER : "nvapi-..."}
                  className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            </section>

            <section className="space-y-4">
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
                Tuning & Parameters
              </label>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Temperature</span>
                  <span>{temp.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={temp}
                  onChange={e => setTemp(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
                <p className="text-[10px] text-stone-400">
                  Higher temperature makes output more creative but less predictable.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wide text-stone-500">
                Role Assignments
              </label>
              <div className="grid grid-cols-1 gap-3">
                {ROLE_HINTS.map(hint => (
                  <div key={hint} className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-stone-700">{ROLE_LABELS[hint].label}</label>
                    <input
                      type="text"
                      value={roleModels[hint]}
                      onChange={e => {
                        setRoleModels(prev => ({ ...prev, [hint]: e.target.value }));
                        setRoleModelsDirty(true);
                      }}
                      placeholder={ROLE_LABELS[hint].help}
                      className="w-full rounded-lg border border-stone-200 px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                  </div>
                ))}
              </div>
            </section>

            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleSaveCloud}
                disabled={savingCloud}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-semibold hover:bg-primary-700 disabled:opacity-50">
                {savingCloud ? 'Saving...' : 'Save Cloud Config'}
              </button>
              {cloudStatus.kind !== 'idle' && (
                <span className={`text-xs ${cloudStatus.kind === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                  {cloudStatus.message}
                </span>
              )}
            </div>
          </div>
        )}

        {activeTab === 'local' && (
          <div className="space-y-6">
            <DeviceCapabilitySection
              presetsData={presetsData}
              presetsLoading={presetsLoading}
              presetError={presetError}
              presetSuccess={presetSuccess}
              formatRamGb={formatRamGb}
              ollamaAvailable={downloads?.ollama_available ?? true}
              onTriggerOllamaInstall={() => {}}
              isTriggeringInstall={isTriggeringDownload}
              onPresetApplied={result => {
                setPresetSuccess(result);
                void loadLocal();
              }}
            />

            <section className="bg-stone-50 rounded-lg border border-stone-200 p-4 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-stone-900">Usage Matrix</h3>
                <p className="text-xs text-stone-400 mt-1">Select tasks to offload to your local machine.</p>
              </div>
              
              <label className="flex items-center gap-3 p-2 bg-white rounded-md border border-stone-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={usageFlags.runtime_enabled}
                  onChange={e => void updateUsage({ runtime_enabled: e.target.checked })}
                  className="rounded text-primary-600"
                />
                <span className="text-sm font-medium text-stone-800">Master Enable Local Runtime</span>
              </label>

              <div className={`grid grid-cols-2 gap-3 pl-2 ${usageFlags.runtime_enabled ? '' : 'opacity-40 pointer-events-none'}`}>
                {[
                  { key: 'usage_embeddings', label: 'Embeddings' },
                  { key: 'usage_heartbeat', label: 'Heartbeat' },
                  { key: 'usage_learning_reflection', label: 'Learning' },
                  { key: 'usage_subconscious', label: 'Subconscious' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(usageFlags as any)[key]}
                      onChange={e => void updateUsage({ [key]: e.target.checked })}
                      className="rounded text-primary-600"
                    />
                    <span className="text-xs text-stone-600">{label}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="bg-stone-50 rounded-lg border border-stone-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Runtime Status</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentState === 'ready' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                  {currentState?.toUpperCase() ?? 'OFF'}
                </span>
              </div>
              
              {isTriggeringDownload && (
                <div className="space-y-2">
                  <div className="h-1.5 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 animate-pulse w-full" />
                  </div>
                  <p className="text-[10px] text-stone-500 italic">Processing local assets...</p>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => triggerDownload(false)}
                  disabled={!runtimeEnabled || isTriggeringDownload}
                  className="flex-1 py-2 bg-stone-800 text-white text-xs font-semibold rounded hover:bg-black disabled:opacity-30">
                  Sync Models
                </button>
                <button
                  onClick={() => loadLocal()}
                  className="px-4 py-2 border border-stone-300 text-xs font-semibold rounded hover:bg-stone-100">
                  Refresh
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocalModelPanel;
