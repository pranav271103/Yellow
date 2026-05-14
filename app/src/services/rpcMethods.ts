export const CORE_RPC_METHODS = {
  configGet: 'yellow.config_get',
  configGetAnalyticsSettings: 'yellow.config_get_analytics_settings',
  configGetComposioTriggerSettings: 'yellow.config_get_composio_trigger_settings',
  configGetRuntimeFlags: 'yellow.config_get_runtime_flags',
  configSetBrowserAllowAll: 'yellow.config_set_browser_allow_all',
  configUpdateAnalyticsSettings: 'yellow.config_update_analytics_settings',
  configUpdateBrowserSettings: 'yellow.config_update_browser_settings',
  configUpdateComposioTriggerSettings: 'yellow.config_update_composio_trigger_settings',
  configUpdateLocalAiSettings: 'yellow.config_update_local_ai_settings',
  configUpdateMemorySettings: 'yellow.config_update_memory_settings',
  configUpdateModelSettings: 'yellow.config_update_model_settings',
  configUpdateRuntimeSettings: 'yellow.config_update_runtime_settings',
  configUpdateScreenIntelligenceSettings: 'yellow.config_update_screen_intelligence_settings',
  configWorkspaceOnboardingFlagExists: 'yellow.config_workspace_onboarding_flag_exists',
  configWorkspaceOnboardingFlagSet: 'yellow.config_workspace_onboarding_flag_set',
  corePing: 'core.ping',
  screenIntelligenceStatus: 'yellow.screen_intelligence_status',
} as const;

export type CoreRpcMethod = (typeof CORE_RPC_METHODS)[keyof typeof CORE_RPC_METHODS];

export const LEGACY_METHOD_ALIASES: Record<string, CoreRpcMethod> = {
  'openhuman.get_analytics_settings': CORE_RPC_METHODS.configGetAnalyticsSettings,
  'openhuman.get_composio_trigger_settings': CORE_RPC_METHODS.configGetComposioTriggerSettings,
  'openhuman.get_config': CORE_RPC_METHODS.configGet,
  'openhuman.get_runtime_flags': CORE_RPC_METHODS.configGetRuntimeFlags,
  'openhuman.ping': CORE_RPC_METHODS.corePing,
  'openhuman.set_browser_allow_all': CORE_RPC_METHODS.configSetBrowserAllowAll,
  'openhuman.update_analytics_settings': CORE_RPC_METHODS.configUpdateAnalyticsSettings,
  'openhuman.update_browser_settings': CORE_RPC_METHODS.configUpdateBrowserSettings,
  'openhuman.update_composio_trigger_settings':
    CORE_RPC_METHODS.configUpdateComposioTriggerSettings,
  'openhuman.update_local_ai_settings': CORE_RPC_METHODS.configUpdateLocalAiSettings,
  'openhuman.update_memory_settings': CORE_RPC_METHODS.configUpdateMemorySettings,
  'openhuman.update_model_settings': CORE_RPC_METHODS.configUpdateModelSettings,
  'openhuman.update_runtime_settings': CORE_RPC_METHODS.configUpdateRuntimeSettings,
  'openhuman.update_screen_intelligence_settings':
    CORE_RPC_METHODS.configUpdateScreenIntelligenceSettings,
  'openhuman.workspace_onboarding_flag_exists':
    CORE_RPC_METHODS.configWorkspaceOnboardingFlagExists,
  'openhuman.workspace_onboarding_flag_set': CORE_RPC_METHODS.configWorkspaceOnboardingFlagSet,
  'yellow.get_analytics_settings': CORE_RPC_METHODS.configGetAnalyticsSettings,
  'yellow.get_composio_trigger_settings': CORE_RPC_METHODS.configGetComposioTriggerSettings,
  'yellow.get_config': CORE_RPC_METHODS.configGet,
  'yellow.get_runtime_flags': CORE_RPC_METHODS.configGetRuntimeFlags,
  'yellow.ping': CORE_RPC_METHODS.corePing,
  'yellow.set_browser_allow_all': CORE_RPC_METHODS.configSetBrowserAllowAll,
  'yellow.update_analytics_settings': CORE_RPC_METHODS.configUpdateAnalyticsSettings,
  'yellow.update_browser_settings': CORE_RPC_METHODS.configUpdateBrowserSettings,
  'yellow.update_composio_trigger_settings': CORE_RPC_METHODS.configUpdateComposioTriggerSettings,
  'yellow.update_local_ai_settings': CORE_RPC_METHODS.configUpdateLocalAiSettings,
  'yellow.update_memory_settings': CORE_RPC_METHODS.configUpdateMemorySettings,
  'yellow.update_model_settings': CORE_RPC_METHODS.configUpdateModelSettings,
  'yellow.update_runtime_settings': CORE_RPC_METHODS.configUpdateRuntimeSettings,
  'yellow.update_screen_intelligence_settings':
    CORE_RPC_METHODS.configUpdateScreenIntelligenceSettings,
  'yellow.workspace_onboarding_flag_exists': CORE_RPC_METHODS.configWorkspaceOnboardingFlagExists,
  'yellow.workspace_onboarding_flag_set': CORE_RPC_METHODS.configWorkspaceOnboardingFlagSet,
};

export function normalizeRpcMethod(method: string): string {
  const normalized = method.trim().toLowerCase();

  if (normalized in LEGACY_METHOD_ALIASES) {
    return LEGACY_METHOD_ALIASES[normalized];
  }

  if (normalized.startsWith('openhuman.auth.')) {
    return `yellow.auth_${normalized.slice('openhuman.auth.'.length).split('.').join('_')}`;
  }

  if (normalized.startsWith('yellow.auth.')) {
    return `yellow.auth_${normalized.slice('yellow.auth.'.length).split('.').join('_')}`;
  }

  if (normalized.startsWith('openhuman.accessibility_')) {
    return normalized.replace('openhuman.accessibility_', 'yellow.screen_intelligence_');
  }

  if (normalized.startsWith('yellow.accessibility_')) {
    return normalized.replace('yellow.accessibility_', 'yellow.screen_intelligence_');
  }

  if (normalized.startsWith('openhuman.')) {
    return `yellow.${normalized.slice('openhuman.'.length)}`;
  }

  return normalized;
}
