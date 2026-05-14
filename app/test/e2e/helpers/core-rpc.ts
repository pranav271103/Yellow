/**
 * Core JSON-RPC for E2E: WebView execute on tauri-driver (Linux), Node fetch on Appium Mac2.
 */
import { callYellowRpcNode } from './core-rpc-node';
import type { RpcCallResult } from './core-rpc-webview';
import { callYellowRpcWebView } from './core-rpc-webview';
import { supportsExecuteScript } from './platform';

export type { RpcCallResult };

export async function callYellowRpc<T = unknown>(
  method: string,
  params: Record<string, unknown> = {}
): Promise<RpcCallResult<T>> {
  if (supportsExecuteScript()) {
    return callYellowRpcWebView<T>(method, params);
  }
  return callYellowRpcNode<T>(method, params);
}
