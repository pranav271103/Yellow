import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useCoreState } from '../../providers/CoreStateProvider';
import { persistor } from '../../store';
import { BILLING_DASHBOARD_URL } from '../../utils/links';
import { openUrl } from '../../utils/openUrl';
import {
  resetOpenHumanDataAndRestartCore,
  restartApp,
  scheduleCefProfilePurge,
} from '../../utils/tauriCommands';
import { resetWalkthrough } from '../walkthrough/AppWalkthrough';
import SettingsHeader from './components/SettingsHeader';
import SettingsMenuItem from './components/SettingsMenuItem';
import { useSettingsNavigation } from './hooks/useSettingsNavigation';

interface SettingsSection {
  label: string;
  items: SettingsItem[];
}

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
  dangerous?: boolean;
}

// Subtle uppercase section header label separating settings groups
const SectionHeader = ({ label }: { label: string }) => (
  <div className="px-4 pt-5 pb-1">
    <span className="text-[10px] font-semibold tracking-widest uppercase text-stone-400">
      {label}
    </span>
  </div>
);

const SettingsHome = () => {
  const navigate = useNavigate();
  const { navigateToSettings } = useSettingsNavigation();
  const { clearSession, snapshot } = useCoreState();
  const [showLogoutAndClearModal, setShowLogoutAndClearModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await clearSession();
    } catch (err) {
      console.warn('[Settings] Rust logout failed:', err);
      setError('Failed to log out. Please try again.');
    }
  };

  const clearAllAppData = async () => {
    const currentUserId = snapshot.auth.userId ?? snapshot.currentUser?._id ?? null;

    // Queue the current user-scoped CEF profile for deletion on next launch.
    // The active CEF browser process may still hold SQLite/cache file handles,
    // so we delete after the shell restarts rather than relying on in-process
    // removal to succeed everywhere.
    try {
      await scheduleCefProfilePurge(currentUserId);
    } catch (err) {
      console.warn('[Settings] Failed to queue CEF profile purge:', err);
    }

    // 1. Logout — clear session in core (auth_clear_session). Best-effort:
    //    if the core process is wedged we still want to wipe local data.
    try {
      await clearSession();
    } catch (err) {
      console.warn('[Settings] Rust logout failed during clearAllAppData:', err);
    }

    // 2. Delete workspace folder + restart core. The core RPC removes both
    //    the active openhuman_dir and the default ~/.openhuman, then we
    //    restart the sidecar so it boots from a clean slate.
    try {
      await resetOpenHumanDataAndRestartCore();
    } catch (err) {
      console.warn('[Settings] Failed to reset OpenHuman data dir and restart core:', err);
      throw err;
    }

    // 3. Purge redux-persist storage + browser storage. `persistor.purge()`
    //    wipes the persisted backend; localStorage/sessionStorage clears
    //    everything else (auth flags, theme, etc.).
    try {
      await persistor.purge();
    } catch (err) {
      console.warn('[Settings] persistor.purge failed:', err);
      setError('Failed to clear persisted app state. Please try again.');
      return;
    }
    window.localStorage.clear();
    window.sessionStorage.clear();

    // 4. Full app restart so the CEF runtime reboots into the fresh
    //    pre-login profile instead of keeping the old browser process alive.
    await restartApp();
  };

  const handleLogoutAndClearData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await clearAllAppData(); // This will redirect to login
    } catch (_error) {
      setError('Failed to clear data and logout. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const settingsSections: SettingsSection[] = [    {
      label: 'AI & Models',
      items: [
        {
          id: 'ai-models',
          title: 'AI & Models',
          description: 'Configure Cloud (NVIDIA NIM) and Local (Ollama) AI models',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
              />
            </svg>
          ),
          onClick: () => navigateToSettings('ai-models'),
        },
      ],
    },

  ];

  return (
    <div className="z-10 relative">
      <div data-walkthrough="settings-menu">
        <SettingsHeader />
      </div>

      <div>
        {/* Grouped sections with section headers */}
        {settingsSections.map(section => (
          <div key={section.label}>
            <SectionHeader label={section.label} />
            {section.items.map((item, index) => (
              <SettingsMenuItem
                key={item.id}
                icon={item.icon}
                title={item.title}
                description={item.description}
                onClick={item.onClick}
                dangerous={item.dangerous}
                isFirst={index === 0}
                isLast={index === section.items.length - 1}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Log Out & Clear Data Confirmation Modal */}
      {showLogoutAndClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-amber-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-stone-900">Clear App Data</h3>
              </div>
            </div>

            <div className="mb-6">
              <div className="text-stone-700 text-sm leading-relaxed">
                <p>This will sign you out and permanently delete local app data including:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>App settings and conversations</li>
                  <li>All local integration cache data</li>
                  <li>Workspace data</li>
                  <li>All other local data</li>
                </ul>
                <p className="mt-3">This action cannot be undone.</p>
              </div>

              {error && (
                <div className="mt-3 p-3 rounded-lg bg-coral-100 border border-coral-500/20">
                  <p className="text-coral-600 text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLogoutAndClearModal(false);
                  setError(null);
                }}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-lg border border-stone-200 text-stone-700 hover:bg-stone-100 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button
                onClick={handleLogoutAndClearData}
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-sm bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading && (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                )}
                {isLoading ? 'Clearing App Data...' : 'Clear App Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsHome;
