import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import {
  McpJsonRpcRequest,
  McpJsonRpcResponse,
  McpServerConfig,
  McpToolDescriptor,
} from './mcp.types';

const MCP_PROTOCOL_VERSION = '2025-03-26';
const DEFAULT_TIMEOUT_MS = 30_000;

export class McpClientError extends Error {
  readonly code: string;

  constructor(message: string, code = 'MCP_ERROR') {
    super(message);
    this.name = 'McpClientError';
    this.code = code;
  }
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface McpTransport {
  connect(): Promise<void>;
  request(method: string, params?: unknown): Promise<unknown>;
  notify(method: string, params?: unknown): void;
  close(): Promise<void>;
}

function assertRpcResult(response: McpJsonRpcResponse): unknown {
  if (response.error) {
    throw new McpClientError(
      response.error.message ?? 'MCP JSON-RPC error',
      `MCP_RPC_${response.error.code}`,
    );
  }
  return response.result;
}

function parseToolDescriptors(result: unknown): McpToolDescriptor[] {
  const tools = (result as { tools?: unknown })?.tools;
  if (!Array.isArray(tools)) {
    return [];
  }

  return tools
    .filter(
      (tool): tool is Record<string, unknown> =>
        !!tool && typeof tool === 'object' && typeof tool.name === 'string',
    )
    .map((tool) => ({
      name: tool.name as string,
      description:
        typeof tool.description === 'string' ? tool.description : undefined,
      inputSchema:
        tool.inputSchema && typeof tool.inputSchema === 'object'
          ? (tool.inputSchema as Record<string, unknown>)
          : { type: 'object', properties: {} },
    }));
}

abstract class BaseMcpTransport implements McpTransport {
  protected readonly timeoutMs: number;
  private nextId = 1;
  private readonly pending = new Map<number, PendingRequest>();
  private connected = false;

  constructor(timeoutMs: number) {
    this.timeoutMs = timeoutMs;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      return;
    }

    await this.initialize();
    this.connected = true;
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    const id = this.nextId++;
    const message: McpJsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new McpClientError(
            `MCP request timed out: ${method}`,
            'MCP_TIMEOUT',
          ),
        );
      }, this.timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      this.send(message).catch((error) => {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(error instanceof Error ? error : new McpClientError(String(error)));
      });
    });
  }

  notify(method: string, params?: unknown): void {
    const message: McpJsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
    };
    void this.send(message);
  }

  protected handleMessage(raw: unknown): void {
    if (!raw || typeof raw !== 'object') {
      return;
    }

    const message = raw as McpJsonRpcResponse;
    if (message.id === undefined) {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timer);
    this.pending.delete(message.id);

    try {
      pending.resolve(assertRpcResult(message));
    } catch (error) {
      pending.reject(error instanceof Error ? error : new McpClientError(String(error)));
    }
  }

  protected rejectAllPending(message: string): void {
    for (const [id, pending] of this.pending.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new McpClientError(message, 'MCP_DISCONNECTED'));
      this.pending.delete(id);
    }
  }

  protected abstract send(message: McpJsonRpcRequest): Promise<void>;

  protected abstract closeTransport(): Promise<void>;

  private async initialize(): Promise<void> {
    await this.request('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'elpis-mcp-client',
        version: '1.0.0',
      },
    });
    this.notify('notifications/initialized');
  }

  async close(): Promise<void> {
    this.rejectAllPending('MCP client closed');
    await this.closeTransport();
    this.connected = false;
  }
}

class StdioMcpTransport extends BaseMcpTransport {
  private proc?: ChildProcessWithoutNullStreams;
  private stdoutBuffer = '';

  constructor(private readonly config: McpServerConfig) {
    super(config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }

  protected async send(message: McpJsonRpcRequest): Promise<void> {
    if (!this.proc?.stdin.writable) {
      throw new McpClientError('MCP stdio process is not writable', 'MCP_STDIO_CLOSED');
    }

    this.proc.stdin.write(`${JSON.stringify(message)}\n`);
  }

  protected async closeTransport(): Promise<void> {
    const proc = this.proc;
    this.proc = undefined;

    if (!proc) {
      return;
    }

    proc.stdin.end();

    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        proc.kill();
        resolve();
      }, 1_000);

      proc.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  async connect(): Promise<void> {
    if (this.proc) {
      return;
    }

    const command = this.config.command;
    if (!command) {
      throw new McpClientError('MCP stdio server missing command', 'MCP_CONFIG');
    }

    this.proc = spawn(command, this.config.args ?? [], {
      cwd: this.config.cwd ?? process.cwd(),
      env: {
        ...process.env,
        ...this.config.env,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.stdout.setEncoding('utf8');
    this.proc.stdout.on('data', (chunk: string) => {
      this.stdoutBuffer += chunk;
      this.flushStdoutBuffer();
    });

    this.proc.stderr.setEncoding('utf8');
    this.proc.stderr.on('data', (chunk: string) => {
      console.error(`[McpClient:${this.config.name}] stderr:`, chunk.trim());
    });

    this.proc.on('exit', (code, signal) => {
      const reason =
        code !== null
          ? `MCP stdio process exited with code ${code}`
          : `MCP stdio process exited with signal ${signal ?? 'unknown'}`;
      this.rejectAllPending(reason);
    });

    this.proc.on('error', (error) => {
      this.rejectAllPending(error.message);
    });

    await super.connect();
  }

  private flushStdoutBuffer(): void {
    let newlineIndex = this.stdoutBuffer.indexOf('\n');
    while (newlineIndex >= 0) {
      const line = this.stdoutBuffer.slice(0, newlineIndex).trim();
      this.stdoutBuffer = this.stdoutBuffer.slice(newlineIndex + 1);

      if (line) {
        try {
          this.handleMessage(JSON.parse(line));
        } catch (error) {
          console.error(
            `[McpClient:${this.config.name}] failed to parse stdout line:`,
            line,
            error,
          );
        }
      }

      newlineIndex = this.stdoutBuffer.indexOf('\n');
    }
  }
}

class HttpMcpTransport extends BaseMcpTransport {
  private sessionId?: string;
  private closed = false;

  constructor(private readonly config: McpServerConfig) {
    super(config.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }

  protected async send(message: McpJsonRpcRequest): Promise<void> {
    if (this.closed) {
      throw new McpClientError('MCP HTTP client is closed', 'MCP_HTTP_CLOSED');
    }

    const url = this.config.url;
    if (!url) {
      throw new McpClientError('MCP HTTP server missing url', 'MCP_CONFIG');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      ...(this.config.headers ?? {}),
    };

    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      const sessionId = response.headers.get('mcp-session-id');
      if (sessionId) {
        this.sessionId = sessionId;
      }

      const contentType = response.headers.get('content-type') ?? '';

      if (!response.ok) {
        const body = await response.text();
        throw new McpClientError(
          `MCP HTTP request failed (${response.status}): ${body}`,
          'MCP_HTTP_ERROR',
        );
      }

      if (message.id === undefined) {
        return;
      }

      if (contentType.includes('text/event-stream')) {
        const payload = await this.readSsePayload(response);
        this.handleMessage(payload);
        return;
      }

      const payload = (await response.json()) as McpJsonRpcResponse;
      this.handleMessage(payload);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new McpClientError(
          `MCP HTTP request timed out: ${message.method}`,
          'MCP_TIMEOUT',
        );
      }
      throw error instanceof Error ? error : new McpClientError(String(error));
    } finally {
      clearTimeout(timer);
    }
  }

  protected async closeTransport(): Promise<void> {
    this.closed = true;
    this.sessionId = undefined;
  }

  private async readSsePayload(response: Response): Promise<McpJsonRpcResponse> {
    const body = await response.text();
    const dataLines = body
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trim())
      .filter(Boolean);

    if (dataLines.length === 0) {
      throw new McpClientError('MCP HTTP SSE response contained no data', 'MCP_HTTP_SSE');
    }

    const lastLine = dataLines[dataLines.length - 1];
    return JSON.parse(lastLine) as McpJsonRpcResponse;
  }
}

export class McpClient {
  private readonly transport: McpTransport;

  constructor(private readonly config: McpServerConfig) {
    if (config.command) {
      this.transport = new StdioMcpTransport(config);
      return;
    }

    if (config.url) {
      this.transport = new HttpMcpTransport(config);
      return;
    }

    throw new McpClientError(
      `MCP server "${config.name}" must declare command or url`,
      'MCP_CONFIG',
    );
  }

  get serverName(): string {
    return this.config.name;
  }

  async connect(): Promise<void> {
    await this.transport.connect();
  }

  async listTools(): Promise<McpToolDescriptor[]> {
    const result = await this.transport.request('tools/list', {});
    return parseToolDescriptors(result);
  }

  async callTool(name: string, args: unknown): Promise<unknown> {
    return this.transport.request('tools/call', {
      name,
      arguments: args ?? {},
    });
  }

  async close(): Promise<void> {
    await this.transport.close();
  }
}
