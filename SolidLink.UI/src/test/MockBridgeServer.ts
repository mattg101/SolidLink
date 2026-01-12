import type { BridgeMessage } from '../bridge/types';

type MessageListener = (event: MessageEvent) => void;
type ClientHandler = (message: BridgeMessage) => void;

export class MockBridgeServer {
  private listeners = new Set<MessageListener>();
  private clientHandlers = new Set<ClientHandler>();

  install(): void {
    const win = window as any;
    if (!win.chrome) {
      win.chrome = {};
    }

    win.chrome.webview = {
      addEventListener: (_type: string, handler: MessageListener) => {
        this.listeners.add(handler);
      },
      removeEventListener: (_type: string, handler: MessageListener) => {
        this.listeners.delete(handler);
      },
      postMessage: (message: BridgeMessage) => {
        this.clientHandlers.forEach((handler) => handler(message));
      },
    };

    win.__mockBridge__ = this;
  }

  send(type: string, payload?: unknown): void {
    const message: BridgeMessage = {
      type,
      correlationId: this.createId(),
      payload,
    };

    this.listeners.forEach((listener) => {
      listener({ data: message } as MessageEvent);
    });
  }

  onClientMessage(handler: ClientHandler): () => void {
    this.clientHandlers.add(handler);
    return () => this.clientHandlers.delete(handler);
  }

  async loadScenario(path: string): Promise<void> {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`Failed to load scenario: ${response.statusText}`);
    }

    const scenario = await response.json();
    if (Array.isArray(scenario)) {
      scenario.forEach((step) => {
        if (step && step.type) {
          this.send(step.type, step.payload);
        }
      });
    }
  }

  private createId(): string {
    return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
