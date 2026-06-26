declare module "qrcode-terminal" {
  export function generate(text: string, options?: { small?: boolean }): void;
}

declare module "whatsapp-web.js" {
  export class Client {
    constructor(options?: unknown);
    info?: { wid?: { _serialized?: string } };
    on(event: "authenticated", listener: () => void): this;
    on(event: "qr", listener: (qr: string) => void): this;
    on(event: "ready", listener: () => void): this;
    on(event: "auth_failure", listener: (message: string) => void): this;
    on(event: "disconnected", listener: (reason: string) => void): this;
    off(event: "ready", listener: () => void): this;
    off(event: "auth_failure", listener: (message: string) => void): this;
    initialize(): Promise<void>;
    getState(): Promise<string | null>;
    getNumberId(number: string): Promise<{ _serialized: string } | null>;
    destroy(): Promise<void>;
    sendMessage(
      chatId: string,
      content: MessageMedia | string,
      options?: { caption?: string },
    ): Promise<unknown>;
  }

  export class LocalAuth {
    constructor(options?: { dataPath?: string });
  }

  export class MessageMedia {
    constructor(mimetype: string, data: string, filename?: string);
  }
}
