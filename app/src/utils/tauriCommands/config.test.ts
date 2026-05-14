import { isTauri } from '@tauri-apps/api/core';
import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest';

import { callCoreRpc } from '../../services/coreRpcClient';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock('../../services/coreRpcClient', () => ({ callCoreRpc: vi.fn() }));

describe('tauriCommands/config', () => {
  const mockIsTauri = isTauri as Mock;
  const mockCallCoreRpc = callCoreRpc as Mock;
  let yellowUpdateLocalAiSettings: typeof import('./config').yellowUpdateLocalAiSettings;
  let yellowUpdateMeetSettings: typeof import('./config').yellowUpdateMeetSettings;
  let yellowGetMeetSettings: typeof import('./config').yellowGetMeetSettings;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    const actual = await vi.importActual<typeof import('./config')>('./config');
    yellowUpdateLocalAiSettings = actual.yellowUpdateLocalAiSettings;
    yellowUpdateMeetSettings = actual.yellowUpdateMeetSettings;
    yellowGetMeetSettings = actual.yellowGetMeetSettings;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('yellowUpdateLocalAiSettings', () => {
    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(yellowUpdateLocalAiSettings({ runtime_enabled: true })).rejects.toThrow(
        'Not running in Tauri'
      );
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('forwards the patch to yellow.config_update_local_ai_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({
        result: { config: {}, workspace_dir: '/tmp', config_path: '/tmp/cfg.toml' },
        logs: [],
      });
      const patch = { runtime_enabled: true, usage_embeddings: true, usage_subconscious: false };
      await yellowUpdateLocalAiSettings(patch);
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_update_local_ai_settings',
        params: patch,
      });
    });
  });

  describe('yellowUpdateMeetSettings (#1299)', () => {
    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(
        yellowUpdateMeetSettings({ auto_orchestrator_handoff: true })
      ).rejects.toThrow('Not running in Tauri');
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('forwards the patch to yellow.config_update_meet_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({
        result: { config: {}, workspace_dir: '/tmp', config_path: '/tmp/cfg.toml' },
        logs: [],
      });
      await yellowUpdateMeetSettings({ auto_orchestrator_handoff: true });
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_update_meet_settings',
        params: { auto_orchestrator_handoff: true },
      });
    });
  });

  describe('yellowGetMeetSettings (#1299)', () => {
    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(yellowGetMeetSettings()).rejects.toThrow('Not running in Tauri');
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('reads via yellow.config_get_meet_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({ result: { auto_orchestrator_handoff: true }, logs: [] });
      const out = await yellowGetMeetSettings();
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_get_meet_settings',
      });
      expect(out.result.auto_orchestrator_handoff).toBe(true);
    });
  });

  describe('yellowUpdateComposioTriggerSettings', () => {
    let yellowUpdateComposioTriggerSettings: typeof import('./config').yellowUpdateComposioTriggerSettings;

    beforeEach(async () => {
      const actual = await vi.importActual<typeof import('./config')>('./config');
      yellowUpdateComposioTriggerSettings = actual.yellowUpdateComposioTriggerSettings;
    });

    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(
        yellowUpdateComposioTriggerSettings({ triage_disabled: true })
      ).rejects.toThrow('Not running in Tauri');
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('forwards the patch to yellow.config_update_composio_trigger_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({
        result: { config: {}, workspace_dir: '/tmp', config_path: '/tmp/cfg.toml' },
        logs: [],
      });
      const patch = { triage_disabled: true, triage_disabled_toolkits: ['gmail', 'slack'] };
      await yellowUpdateComposioTriggerSettings(patch);
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_update_composio_trigger_settings',
        params: patch,
      });
    });
  });

  describe('yellowGetComposioTriggerSettings', () => {
    let yellowGetComposioTriggerSettings: typeof import('./config').yellowGetComposioTriggerSettings;

    beforeEach(async () => {
      const actual = await vi.importActual<typeof import('./config')>('./config');
      yellowGetComposioTriggerSettings = actual.yellowGetComposioTriggerSettings;
    });

    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(yellowGetComposioTriggerSettings()).rejects.toThrow('Not running in Tauri');
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('reads via yellow.config_get_composio_trigger_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({
        result: { triage_disabled: false, triage_disabled_toolkits: ['slack'] },
        logs: [],
      });
      const out = await yellowGetComposioTriggerSettings();
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_get_composio_trigger_settings',
      });
      expect(out.result.triage_disabled).toBe(false);
      expect(out.result.triage_disabled_toolkits).toEqual(['slack']);
    });
  });
});
