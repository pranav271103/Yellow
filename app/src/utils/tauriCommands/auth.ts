/**
 * Authentication commands.
 */
import { invoke } from '@tauri-apps/api/core';

import { callCoreRpc } from '../../services/coreRpcClient';
import { CommandResponse, isTauri } from './common';

/**
 * Exchange a login token for a session token
 */
export async function yellowExchangeToken(
  backendUrl: string,
  token: string
): Promise<{ sessionToken: string; user: object }> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }

  return await invoke('exchange_token', { backendUrl, token });
}

/**
 * Get the current authentication state from Rust
 */
export async function yellowGetAuthState(): Promise<{ is_authenticated: boolean; user: object | null }> {
  if (!isTauri()) {
    return { is_authenticated: false, user: null };
  }

  const response = await callCoreRpc<{ result: { isAuthenticated: boolean; user: object | null } }>(
    { method: 'yellow.auth_get_state' }
  );

  return { is_authenticated: response.result.isAuthenticated, user: response.result.user };
}

/**
 * Get the session token from secure storage
 */
export async function yellowGetSessionToken(): Promise<string | null> {
  if (!isTauri()) {
    return null;
  }

  const response = await callCoreRpc<{ result: { token: string | null } }>({
    method: 'yellow.auth_get_session_token',
  });
  return response.result.token;
}

/**
 * Logout and clear session
 */
export async function yellowLogout(): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await callCoreRpc({ method: 'yellow.auth_clear_session' });
}

/**
 * Store session in secure storage
 */
export async function yellowStoreSession(token: string, user: object): Promise<void> {
  if (!isTauri()) {
    return;
  }

  await callCoreRpc({ method: 'yellow.auth_store_session', params: { token, user } });
}

export async function yellowEncryptSecret(plaintext: string): Promise<CommandResponse<string>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<string>>({
    method: 'yellow.encrypt_secret',
    params: { plaintext },
  });
}

export async function yellowDecryptSecret(ciphertext: string): Promise<CommandResponse<string>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<string>>({
    method: 'yellow.decrypt_secret',
    params: { ciphertext },
  });
}
