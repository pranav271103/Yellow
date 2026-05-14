import { isTauri } from '@tauri-apps/api/core';
import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest';

import { callCoreRpc } from '../../services/coreRpcClient';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock('../../services/coreRpcClient', () => ({ callCoreRpc: vi.fn() }));

describe('tauriCommands/config', () => {
  const mockIsTauri = isTauri as Mock;
  const mockCallCoreRpc = callCoreRpc as Mock;
  let YellowUpdateLocalAiSettings: typeof import('./config').YellowUpdateLocalAiSettings;
  let YellowUpdateMeetSettings: typeof import('./config').YellowUpdateMeetSettings;
  let YellowGetMeetSettings: typeof import('./config').YellowGetMeetSettings;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    const actual = await vi.importActual<typeof import('./config')>('./config');
    YellowUpdateLocalAiSettings = actual.YellowUpdateLocalAiSettings;
    YellowUpdateMeetSettings = actual.YellowUpdateMeetSettings;
    YellowGetMeetSettings = actual.YellowGetMeetSettings;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('YellowUpdateLocalAiSettings', () => {
    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(YellowUpdateLocalAiSettings({ runtime_enabled: true })).rejects.toThrow(
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
      await YellowUpdateLocalAiSettings(patch);
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_update_local_ai_settings',
        params: patch,
      });
    });
  });

  describe('YellowUpdateMeetSettings (#1299)', () => {
    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(
        YellowUpdateMeetSettings({ auto_orchestrator_handoff: true })
      ).rejects.toThrow('Not running in Tauri');
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('forwards the patch to yellow.config_update_meet_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({
        result: { config: {}, workspace_dir: '/tmp', config_path: '/tmp/cfg.toml' },
        logs: [],
      });
      await YellowUpdateMeetSettings({ auto_orchestrator_handoff: true });
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_update_meet_settings',
        params: { auto_orchestrator_handoff: true },
      });
    });
  });

  describe('YellowGetMeetSettings (#1299)', () => {
    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(YellowGetMeetSettings()).rejects.toThrow('Not running in Tauri');
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('reads via yellow.config_get_meet_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({ result: { auto_orchestrator_handoff: true }, logs: [] });
      const out = await YellowGetMeetSettings();
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_get_meet_settings',
      });
      expect(out.result.auto_orchestrator_handoff).toBe(true);
    });
  });

  describe('YellowUpdateComposioTriggerSettings', () => {
    let YellowUpdateComposioTriggerSettings: typeof import('./config').YellowUpdateComposioTriggerSettings;

    beforeEach(async () => {
      const actual = await vi.importActual<typeof import('./config')>('./config');
      YellowUpdateComposioTriggerSettings = actual.YellowUpdateComposioTriggerSettings;
    });

    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(
        YellowUpdateComposioTriggerSettings({ triage_disabled: true })
      ).rejects.toThrow('Not running in Tauri');
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('forwards the patch to yellow.config_update_composio_trigger_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({
        result: { config: {}, workspace_dir: '/tmp', config_path: '/tmp/cfg.toml' },
        logs: [],
      });
      const patch = { triage_disabled: true, triage_disabled_toolkits: ['gmail', 'slack'] };
      await YellowUpdateComposioTriggerSettings(patch);
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_update_composio_trigger_settings',
        params: patch,
      });
    });
  });

  describe('YellowGetComposioTriggerSettings', () => {
    let YellowGetComposioTriggerSettings: typeof import('./config').YellowGetComposioTriggerSettings;

    beforeEach(async () => {
      const actual = await vi.importActual<typeof import('./config')>('./config');
      YellowGetComposioTriggerSettings = actual.YellowGetComposioTriggerSettings;
    });

    test('throws when not running in Tauri', async () => {
      mockIsTauri.mockReturnValue(false);
      await expect(YellowGetComposioTriggerSettings()).rejects.toThrow('Not running in Tauri');
      expect(mockCallCoreRpc).not.toHaveBeenCalled();
    });

    test('reads via yellow.config_get_composio_trigger_settings', async () => {
      mockCallCoreRpc.mockResolvedValue({
        result: { triage_disabled: false, triage_disabled_toolkits: ['slack'] },
        logs: [],
      });
      const out = await YellowGetComposioTriggerSettings();
      expect(mockCallCoreRpc).toHaveBeenCalledWith({
        method: 'yellow.config_get_composio_trigger_settings',
      });
      expect(out.result.triage_disabled).toBe(false);
      expect(out.result.triage_disabled_toolkits).toEqual(['slack']);
    });
  });
});
