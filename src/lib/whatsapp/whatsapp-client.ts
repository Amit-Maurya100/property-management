import fs from "node:fs/promises";
import path from "node:path";
import type { Client } from "whatsapp-web.js";
import { requirePuppeteerExecutablePath, isWhatsAppEnabled } from "@/lib/whatsapp/whatsapp-config";

const SESSION_DIR = path.join(process.cwd(), ".wwebjs_auth", "session");
const WARMUP_READY_TIMEOUT_MS = 300_000;
const SEND_READY_TIMEOUT_MS = 20_000;

type QueuedWhatsAppMessage = {
  whatsappNumber: string;
  mediaBase64: string;
  mediaFilename: string;
  caption: string;
};

const globalForWhatsApp = globalThis as unknown as {
  whatsappClient?: Client;
  whatsappClientPromise?: Promise<Client>;
  messageQueue?: QueuedWhatsAppMessage[];
  isProcessingQueue?: boolean;
};

type WhatsAppClientWithInfo = Client & {
  info?: { wid?: { _serialized?: string } };
};

function getMessageQueue() {
  if (!globalForWhatsApp.messageQueue) {
    globalForWhatsApp.messageQueue = [];
  }
  return globalForWhatsApp.messageQueue;
}

function clearWhatsAppClientState() {
  globalForWhatsApp.whatsappClient = undefined;
  globalForWhatsApp.whatsappClientPromise = undefined;
}

function isClientUsable(client: Client) {
  const withInfo = client as WhatsAppClientWithInfo;
  return Boolean(withInfo.info?.wid?._serialized);
}

function isBrowserAlreadyRunningError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("browser is already running");
}

function isConnectionTimeoutError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("WhatsApp connection timeout");
}

async function clearStaleBrowserSessionLocks() {
  for (const file of ["SingletonLock", "SingletonSocket", "SingletonCookie"]) {
    try {
      await fs.unlink(path.join(SESSION_DIR, file));
    } catch {
      // Ignore missing lock files.
    }
  }
}

function waitForWhatsAppReady(client: Client, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    if (isClientUsable(client)) {
      resolve();
      return;
    }

    const interval = setInterval(() => {
      if (isClientUsable(client)) {
        finish();
      }
    }, 1_000);

    const timer = setTimeout(() => {
      cleanup();
      reject(
        new Error(
          "WhatsApp connection timeout. Scan the QR code shown in the server terminal if prompted.",
        ),
      );
    }, timeoutMs);

    const finish = () => {
      clearTimeout(timer);
      clearInterval(interval);
      cleanup();
      resolve();
    };

    const onReady = () => finish();

    const onAuthFailure = (message: string) => {
      clearTimeout(timer);
      clearInterval(interval);
      cleanup();
      reject(new Error(`WhatsApp auth failure: ${message}`));
    };

    const cleanup = () => {
      client.off("ready", onReady);
      client.off("auth_failure", onAuthFailure);
    };

    client.on("ready", onReady);
    client.on("auth_failure", onAuthFailure);
  });
}

async function waitForClientUsable(client: Client, timeoutMs: number) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (isClientUsable(client)) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("WhatsApp client is not ready to send messages yet");
}

async function initializeWhatsAppClient(client: Client) {
  const readyPromise = waitForWhatsAppReady(client, WARMUP_READY_TIMEOUT_MS);

  try {
    await client.initialize();
  } catch (error) {
    if (isBrowserAlreadyRunningError(error)) {
      if (globalForWhatsApp.whatsappClient && isClientUsable(globalForWhatsApp.whatsappClient)) {
        return globalForWhatsApp.whatsappClient;
      }

      console.warn("Stale WhatsApp browser session detected; clearing lock files and retrying");
      await clearStaleBrowserSessionLocks();
      await client.initialize();
    } else {
      throw error;
    }
  }

  await readyPromise;
  await waitForClientUsable(client, 30_000);
  return client;
}

async function sendQueuedMessage(client: Client, message: QueuedWhatsAppMessage) {
  const { MessageMedia } = await import("whatsapp-web.js");
  const media = new MessageMedia(
    "image/png",
    message.mediaBase64,
    message.mediaFilename,
  );

  const numberId = await client.getNumberId(message.whatsappNumber);
  if (!numberId) {
    console.warn(`Phone ${message.whatsappNumber} is not registered on WhatsApp; skipping queued message`);
    return;
  }

  await client.sendMessage(numberId._serialized, media, { caption: message.caption });
  console.log(`Sent queued WhatsApp message to ${message.whatsappNumber}`);
}

export async function flushWhatsAppMessageQueue() {
  if (globalForWhatsApp.isProcessingQueue) return;

  const client = globalForWhatsApp.whatsappClient;
  if (!client || !isClientUsable(client)) return;

  const queue = getMessageQueue();
  if (queue.length === 0) return;

  globalForWhatsApp.isProcessingQueue = true;
  try {
    while (queue.length > 0) {
      const message = queue[0];
      try {
        await sendQueuedMessage(client, message);
        queue.shift();
      } catch (error) {
        console.error("Failed to send queued WhatsApp message", error);
        break;
      }
    }
  } finally {
    globalForWhatsApp.isProcessingQueue = false;
  }
}

function enqueueWhatsAppMessage(message: QueuedWhatsAppMessage) {
  getMessageQueue().push(message);
  console.log(`Queued WhatsApp message for ${message.whatsappNumber}`);
}

async function createWhatsAppClient() {
  const { Client, LocalAuth } = await import("whatsapp-web.js");
  const qrcode = await import("qrcode-terminal");

  const executablePath = requirePuppeteerExecutablePath();
  const client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(process.cwd(), ".wwebjs_auth"),
    }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath,
    },
  });

  client.on("qr", (qr) => {
    console.log("\nWhatsApp: scan this QR code with your phone\n");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("WhatsApp authenticated");
  });

  client.on("ready", () => {
    console.log("WhatsApp client ready");
    void flushWhatsAppMessageQueue();
  });

  client.on("disconnected", (reason) => {
    console.warn("WhatsApp disconnected:", reason);
    clearWhatsAppClientState();
  });

  try {
    const initialized = await initializeWhatsAppClient(client);
    globalForWhatsApp.whatsappClient = initialized;
    return initialized;
  } catch (error) {
    await client.destroy().catch(() => undefined);
    clearWhatsAppClientState();
    throw error;
  }
}

export function warmUpWhatsAppClient() {
  if (!isWhatsAppEnabled()) return;

  if (globalForWhatsApp.whatsappClient && isClientUsable(globalForWhatsApp.whatsappClient)) {
    void flushWhatsAppMessageQueue();
    return;
  }

  if (globalForWhatsApp.whatsappClientPromise) return;

  globalForWhatsApp.whatsappClientPromise = createWhatsAppClient()
    .then((client) => {
      void flushWhatsAppMessageQueue();
      return client;
    })
    .catch((error) => {
      clearWhatsAppClientState();
      if (!isConnectionTimeoutError(error)) {
        console.error("WhatsApp warmup failed", error);
      } else {
        console.warn(String(error));
      }
      throw error;
    });
}

async function waitForReadyClient(timeoutMs: number) {
  warmUpWhatsAppClient();

  const existing = globalForWhatsApp.whatsappClient;
  if (existing && isClientUsable(existing)) {
    return existing;
  }

  if (!globalForWhatsApp.whatsappClientPromise) {
    return null;
  }

  const client = await Promise.race([
    globalForWhatsApp.whatsappClientPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);

  if (!client || !isClientUsable(client)) {
    return null;
  }

  return client;
}

export type SendWhatsAppMediaResult = "sent" | "queued";

export async function sendWhatsAppMediaMessage(params: {
  whatsappNumber: string;
  mediaBase64: string;
  mediaFilename: string;
  caption: string;
}): Promise<SendWhatsAppMediaResult> {
  if (!isWhatsAppEnabled()) {
    throw new Error("WHATSAPP_DISABLED");
  }

  const client = await waitForReadyClient(SEND_READY_TIMEOUT_MS);
  if (client) {
    await sendQueuedMessage(client, params);
    return "sent";
  }

  enqueueWhatsAppMessage(params);
  warmUpWhatsAppClient();
  return "queued";
}

export async function getWhatsAppClient() {
  if (!isWhatsAppEnabled()) {
    throw new Error("WHATSAPP_DISABLED");
  }

  warmUpWhatsAppClient();

  const client = await waitForReadyClient(WARMUP_READY_TIMEOUT_MS);
  if (!client) {
    throw new Error("WhatsApp is not ready yet");
  }

  return client;
}
