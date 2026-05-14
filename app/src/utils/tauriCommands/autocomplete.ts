/**
 * Autocomplete commands.
 */
import { callCoreRpc } from '../../services/coreRpcClient';
import { CommandResponse, isTauri } from './common';

export interface AutocompleteSuggestion {
  value: string;
  confidence: number;
}

export interface AutocompleteStatus {
  platform_supported: boolean;
  enabled: boolean;
  running: boolean;
  phase: string;
  debounce_ms: number;
  model_id: string;
  app_name?: string | null;
  last_error?: string | null;
  updated_at_ms?: number | null;
  suggestion?: AutocompleteSuggestion | null;
}

export interface AutocompleteStartParams {
  debounce_ms?: number;
}

export interface AutocompleteStartResult {
  started: boolean;
}

export interface AutocompleteStopParams {
  reason?: string;
}

export interface AutocompleteStopResult {
  stopped: boolean;
}

export interface AutocompleteCurrentParams {
  context?: string;
}

export interface AutocompleteCurrentResult {
  app_name?: string | null;
  context: string;
  suggestion?: AutocompleteSuggestion | null;
}

export interface AutocompleteDebugFocusResult {
  app_name?: string | null;
  role?: string | null;
  context: string;
  selected_text?: string | null;
  raw_error?: string | null;
}

export interface AutocompleteAcceptParams {
  suggestion?: string;
  /** When true, skip applying text via accessibility (caller already inserted it). */
  skip_apply?: boolean;
}

export interface AutocompleteAcceptResult {
  accepted: boolean;
  applied: boolean;
  value?: string | null;
  reason?: string | null;
}

export interface AutocompleteSetStyleParams {
  enabled?: boolean;
  debounce_ms?: number;
  max_chars?: number;
  style_preset?: string;
  style_instructions?: string;
  style_examples?: string[];
  disabled_apps?: string[];
  accept_with_tab?: boolean;
  overlay_ttl_ms?: number;
}

export interface AutocompleteConfig {
  enabled: boolean;
  debounce_ms: number;
  max_chars: number;
  style_preset: string;
  style_instructions?: string | null;
  style_examples: string[];
  disabled_apps: string[];
  accept_with_tab: boolean;
  overlay_ttl_ms: number;
}

export interface AutocompleteSetStyleResult {
  config: AutocompleteConfig;
}

export interface AcceptedCompletion {
  context: string;
  suggestion: string;
  app_name?: string | null;
  timestamp_ms: number;
}

export interface AutocompleteHistoryResult {
  entries: AcceptedCompletion[];
}

export interface AutocompleteClearHistoryResult {
  cleared: number;
}

export async function yellowAutocompleteStatus(): Promise<CommandResponse<AutocompleteStatus>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteStatus>>({
    method: 'yellow.autocomplete_status',
  });
}

export async function yellowAutocompleteStart(
  params?: AutocompleteStartParams
): Promise<CommandResponse<AutocompleteStartResult>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteStartResult>>({
    method: 'yellow.autocomplete_start',
    params: params ?? {},
  });
}

export async function yellowAutocompleteStop(
  params?: AutocompleteStopParams
): Promise<CommandResponse<AutocompleteStopResult>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteStopResult>>({
    method: 'yellow.autocomplete_stop',
    params: params ?? {},
  });
}

export async function yellowAutocompleteCurrent(
  params?: AutocompleteCurrentParams
): Promise<CommandResponse<AutocompleteCurrentResult>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteCurrentResult>>({
    method: 'yellow.autocomplete_current',
    params: params ?? {},
  });
}

export async function yellowAutocompleteDebugFocus(): Promise<
  CommandResponse<AutocompleteDebugFocusResult>
> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteDebugFocusResult>>({
    method: 'yellow.autocomplete_debug_focus',
  });
}

export async function yellowAutocompleteAccept(
  params?: AutocompleteAcceptParams
): Promise<CommandResponse<AutocompleteAcceptResult>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteAcceptResult>>({
    method: 'yellow.autocomplete_accept',
    params: params ?? {},
  });
}

export async function yellowAutocompleteSetStyle(
  params: AutocompleteSetStyleParams
): Promise<CommandResponse<AutocompleteSetStyleResult>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteSetStyleResult>>({
    method: 'yellow.autocomplete_set_style',
    params,
  });
}

export async function yellowAutocompleteHistory(params?: {
  limit?: number;
}): Promise<CommandResponse<AutocompleteHistoryResult>> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteHistoryResult>>({
    method: 'yellow.autocomplete_history',
    params: params ?? {},
  });
}

export async function yellowAutocompleteClearHistory(): Promise<
  CommandResponse<AutocompleteClearHistoryResult>
> {
  if (!isTauri()) {
    throw new Error('Not running in Tauri');
  }
  return await callCoreRpc<CommandResponse<AutocompleteClearHistoryResult>>({
    method: 'yellow.autocomplete_clear_history',
  });
}
