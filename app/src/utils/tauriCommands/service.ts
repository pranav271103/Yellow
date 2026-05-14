/**
 * Service and daemon management commands.
 */
import { invoke } from '@tauri-apps/api/core';

import { callCoreRpc } from '../../services/coreRpcClient';
import { CommandResponse, isTauri, parseServiceCliOutput } from './common';

export type ServiceState = 'Running' | 'Stopped' | 'NotInstalled' | { Unknown: string };

export interface ServiceStatus {
  state: ServiceState;
  unit_path?: string | null;
  label: string;
  details?: string | null;
}

export interface AgentServerStatus {
  running: boolean;
  url: string;
}

export interface DaemonHostConfig {
  show_tray: boolean;
}

export interface RestartStatus {
  accepted: boolean;
  source: string;
  reason: string;
}

export async function yellowServiceInstall(): Promise<CommandResponse<ServiceStatus>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  try {
    return await callCoreRpc<CommandResponse<ServiceStatus>>({
      method: 'yellow.service_install',
    });
  } catch {
    const raw = await invoke<string>('service_install_direct');
    return parseServiceCliOutput<ServiceStatus>(raw);
  }
}

export async function yellowServiceStart(): Promise<CommandResponse<ServiceStatus>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  try {
    return await callCoreRpc<CommandResponse<ServiceStatus>>({ method: 'yellow.service_start' });
  } catch {
    const raw = await invoke<string>('service_start_direct');
    return parseServiceCliOutput<ServiceStatus>(raw);
  }
}

export async function yellowServiceStop(): Promise<CommandResponse<ServiceStatus>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  try {
    return await callCoreRpc<CommandResponse<ServiceStatus>>({ method: 'yellow.service_stop' });
  } catch {
    const raw = await invoke<string>('service_stop_direct');
    return parseServiceCliOutput<ServiceStatus>(raw);
  }
}

export async function yellowServiceStatus(): Promise<CommandResponse<ServiceStatus>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  try {
    return await callCoreRpc<CommandResponse<ServiceStatus>>({
      method: 'yellow.service_status',
    });
  } catch {
    const raw = await invoke<string>('service_status_direct');
    return parseServiceCliOutput<ServiceStatus>(raw);
  }
}

export async function yellowServiceUninstall(): Promise<CommandResponse<ServiceStatus>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  try {
    return await callCoreRpc<CommandResponse<ServiceStatus>>({
      method: 'yellow.service_uninstall',
    });
  } catch {
    const raw = await invoke<string>('service_uninstall_direct');
    return parseServiceCliOutput<ServiceStatus>(raw);
  }
}

export async function yellowServiceRestart(
  source?: string,
  reason?: string
): Promise<CommandResponse<RestartStatus>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<RestartStatus>>({
    method: 'yellow.service_restart',
    params: { source, reason },
  });
}

export async function yellowAgentServerStatus(): Promise<CommandResponse<AgentServerStatus>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AgentServerStatus>>({
    method: 'yellow.agent_server_status',
  });
}

export async function yellowGetDaemonHostConfig(): Promise<CommandResponse<DaemonHostConfig>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<DaemonHostConfig>>({
    method: 'yellow.service_daemon_host_get',
  });
}

export async function yellowSetDaemonHostConfig(
  showTray: boolean
): Promise<CommandResponse<DaemonHostConfig>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<DaemonHostConfig>>({
    method: 'yellow.service_daemon_host_set',
    params: { show_tray: showTray },
  });
}
