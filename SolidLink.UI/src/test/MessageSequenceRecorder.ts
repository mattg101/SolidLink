import type { BridgeMessage } from '../bridge/types';

export class MessageSequenceRecorder {
  private messages: BridgeMessage[] = [];
  private handler = (event: MessageEvent) => {
    this.messages.push(event.data as BridgeMessage);
  };

  start(): void {
    window.chrome?.webview?.addEventListener('message', this.handler);
  }

  stop(): void {
    window.chrome?.webview?.removeEventListener('message', this.handler);
  }

  clear(): void {
    this.messages = [];
  }

  getMessages(): BridgeMessage[] {
    return [...this.messages];
  }

  toJson(pretty = true): string {
    return JSON.stringify(this.messages, null, pretty ? 2 : 0);
  }
}
