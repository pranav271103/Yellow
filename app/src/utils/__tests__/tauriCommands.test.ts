import { invoke, isTauri } from '@tauri-apps/api/core';
import { beforeEach, describe, expect, type Mock, test, vi } from 'vitest';

import { callCoreRpc } from '../../services/coreRpcClient';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: vi.fn() }));
vi.mock('../../services/coreRpcClient', () => ({ callCoreRpc: vi.fn() }));

describe('tauriCommands', () => {
  const mockIsTauri = isTauri as Mock;
  const mockInvoke = invoke as Mock;
  const mockCallCoreRpc = callCoreRpc as Mock;
  let getAuthState: typeof import('../tauriCommands').getAuthState;
  let resetYellowDataAndRestartCore: typeof import('../tauriCommands').resetYellowDataAndRestartCore;
  let storeSession: typeof import('../tauriCommands').storeSession;
  let YellowLocalAiStatus: typeof import('../tauriCommands').YellowLocalAiStatus;
  let YellowServiceStatus: typeof import('../tauriCommands').YellowServiceStatus;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockIsTauri.mockReturnValue(true);
    const actual = await vi.importActual<typeof import('../tauriCommands')>('../tauriCommands');
    getAuthState = actual.getAuthState;
    resetYellowDataAndRestartCore = actual.resetYellowDataAndRestartCore;
    storeSession = actual.storeSession;
    YellowLocalAiStatus = actual.YellowLocalAiStatus;
    YellowServiceStatus = actual.YellowServiceStatus;
  });

  test('getAuthState maps result shape from core response', async () => {
    mockCallCoreRpc.mockResolvedValueOnce({
      result: { isAuthenticated: true, user: { id: 'u1' } },
    });

    const response = await getAuthState();

    expect(mockCallCoreRpc).toHaveBeenCalledWith({ method: 'Yellow.auth_get_state' });
    expect(response).toEqual({ is_authenticated: true, user: { id: 'u1' } });
  });

  test('storeSession calls expected RPC method and params', async () => {
    await storeSession('jwt-token', { id: 'u1' });

    expect(mockCallCoreRpc).toHaveBeenCalledWith({
      method: 'Yellow.auth_store_session',
      params: { token: 'jwt-token', user: { id: 'u1' } },
    });
  });

  test('resetYellowDataAndRestartCore invokes the destructive Tauri command', async () => {
    await resetYellowDataAndRestartCore();

    expect(mockCallCoreRpc).toHaveBeenCalledWith({ method: 'Yellow.config_reset_local_data' });
    expect(mockInvoke).toHaveBeenCalledWith('restart_core_process');
  });

  test('YellowLocalAiStatus returns upgrade hint on unknown method', async () => {
    mockCallCoreRpc.mockRejectedValueOnce(new Error('unknown method: Yellow.local_ai_status'));

    await expect(YellowLocalAiStatus()).rejects.toThrow(
      'Local model runtime is unavailable in this core build. Restart app after updating to the latest build.'
    );
  });

  test('YellowServiceStatus throws when not running in Tauri', async () => {
    mockIsTauri.mockReturnValue(false);

    await expect(YellowServiceStatus()).rejects.toThrow('Not running in Tauri');
    expect(mockCallCoreRpc).not.toHaveBeenCalled();
  });
});
