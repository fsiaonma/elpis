export interface McpServerConfig {
  name: string;
  timeoutMs?: number;
  /** stdio 本地拉起（与 url 二选一） */
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  /** 远程已有服务（与 command 二选一） */
  url?: string;
  headers?: Record<string, string>;
}

export interface McpConfig {
  enabled?: boolean;
  servers: McpServerConfig[];
}

export interface McpToolDescriptor {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id?: number;
  method: string;
  params?: unknown;
}

export interface McpJsonRpcResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}
