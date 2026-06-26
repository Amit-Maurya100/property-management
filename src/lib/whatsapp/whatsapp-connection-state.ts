export type WhatsAppConnectionStatus =
  | "disabled"
  | "unavailable"
  | "idle"
  | "initializing"
  | "qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "error";

export type WhatsAppConnectionState = {
  status: WhatsAppConnectionStatus;
  qr: string | null;
  linkedPhone: string | null;
  error: string | null;
  updatedAt: string;
};

const globalForWhatsAppState = globalThis as unknown as {
  whatsappConnectionState?: WhatsAppConnectionState;
};

function nowIso() {
  return new Date().toISOString();
}

function defaultState(
  status: WhatsAppConnectionStatus = "idle",
  overrides: Partial<WhatsAppConnectionState> = {},
): WhatsAppConnectionState {
  return {
    status,
    qr: null,
    linkedPhone: null,
    error: null,
    updatedAt: nowIso(),
    ...overrides,
  };
}

export function getWhatsAppConnectionState(): WhatsAppConnectionState {
  if (!globalForWhatsAppState.whatsappConnectionState) {
    globalForWhatsAppState.whatsappConnectionState = defaultState("idle");
  }
  return globalForWhatsAppState.whatsappConnectionState;
}

export function setWhatsAppConnectionState(
  patch: Partial<WhatsAppConnectionState> & { status?: WhatsAppConnectionStatus },
) {
  const current = getWhatsAppConnectionState();
  globalForWhatsAppState.whatsappConnectionState = {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  };
}

export function resetWhatsAppConnectionState(status: WhatsAppConnectionStatus = "idle") {
  globalForWhatsAppState.whatsappConnectionState = defaultState(status);
}
