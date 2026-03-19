import type { Envelope } from "@concord/protocol";

type MessageHandler = (envelope: Envelope) => void;

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers = new Map<string, Set<MessageHandler>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  constructor(
    private address: string,
    private onOpen?: () => void,
    private onClose?: () => void,
    private onReconnectFailed?: () => void
  ) {}

  connect(): void {
    const url = this.address.replace(/^http/, "ws");
    this.ws = new WebSocket(`${url}/ws`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const envelope = JSON.parse(event.data) as Envelope;
        const handlers = this.handlers.get(envelope.type);
        if (handlers) {
          for (const handler of handlers) handler(envelope);
        }
        // Also fire wildcard handlers
        const wildcardHandlers = this.handlers.get("*");
        if (wildcardHandlers) {
          for (const handler of wildcardHandlers) handler(envelope);
        }
      } catch {
        console.error("[ws] Failed to parse message");
      }
    };

    this.ws.onclose = () => {
      this.onClose?.();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.maxReconnectAttempts = 0; // prevent reconnect
    this.ws?.close();
    this.ws = null;
  }

  send(type: string, payload: unknown): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const envelope: Envelope = {
      type,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      payload,
    };

    this.ws.send(JSON.stringify(envelope));
  }

  on(type: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onReconnectFailed?.();
      return;
    }

    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      console.log(
        `[ws] Reconnecting (attempt ${this.reconnectAttempts})...`
      );
      this.connect();
    }, delay);
  }
}
