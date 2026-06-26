"use client";

import { useCallback, useEffect, useState } from "react";
import { buttonPrimaryClass, buttonSecondaryClass } from "@/components/admin/ui";
import { fetchJson } from "@/lib/api/client-cache";
import type { ResourceGrants } from "@/lib/permissions/grants";

type WhatsAppConnectionStatus =
  | "disabled"
  | "unavailable"
  | "idle"
  | "initializing"
  | "qr"
  | "authenticated"
  | "ready"
  | "disconnected"
  | "error";

type NotificationsPayload = {
  settings: {
    emailEnabled: boolean;
    whatsappEnabled: boolean;
    updatedAt: string;
  };
  email: {
    enabled: boolean;
    configured: boolean;
    fromAddress: string | null;
  };
  whatsapp: {
    enabled: boolean;
    runtimeAvailable: boolean;
    hostedOnVercel: boolean;
    status: WhatsAppConnectionStatus;
    linkedPhone: string | null;
    error: string | null;
    qrDataUrl: string | null;
    updatedAt: string;
  };
};

const WHATSAPP_STATUS_LABELS: Record<WhatsAppConnectionStatus, string> = {
  disabled: "Disabled",
  unavailable: "Unavailable",
  idle: "Idle",
  initializing: "Starting…",
  qr: "Scan QR code",
  authenticated: "Authenticated",
  ready: "Connected",
  disconnected: "Disconnected",
  error: "Error",
};

const WHATSAPP_STATUS_COLORS: Record<WhatsAppConnectionStatus, string> = {
  disabled: "text-slate-400",
  unavailable: "text-amber-300",
  idle: "text-slate-300",
  initializing: "text-sky-300",
  qr: "text-amber-300",
  authenticated: "text-sky-300",
  ready: "text-emerald-400",
  disconnected: "text-red-400",
  error: "text-red-400",
};

type NotificationsAdminProps = {
  grants: ResourceGrants;
};

function EnabledBadge({ enabled }: { enabled: boolean }) {
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs font-medium ${
        enabled ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-700 text-slate-400"
      }`}
    >
      {enabled ? "Enabled" : "Disabled"}
    </span>
  );
}

function ToggleRow({
  label,
  description,
  enabled,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <div>
        <p className="font-medium text-slate-200">{label}</p>
        <p className="mt-1 text-sm text-slate-400">{description}</p>
      </div>
      <input
        type="checkbox"
        className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-800"
        checked={enabled}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
    </label>
  );
}

export function NotificationsAdmin({ grants }: NotificationsAdminProps) {
  const [data, setData] = useState<NotificationsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const payload = await fetchJson<NotificationsPayload>("/api/notifications");
      setData(payload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const shouldPoll = ["initializing", "qr", "authenticated", "disconnected"].includes(
      data.whatsapp.status,
    );
    if (!shouldPoll || !data.settings.whatsappEnabled) return;

    const timer = window.setInterval(() => {
      void load();
    }, 2500);

    return () => window.clearInterval(timer);
  }, [data, load]);

  async function patchSettings(
    patch: Partial<{
      emailEnabled: boolean;
      whatsappEnabled: boolean;
      whatsappAction: "reconnect" | "logout";
    }>,
  ) {
    if (!grants.canUpdate || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = await fetchJson<NotificationsPayload>("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Notifications</h1>
        <p className="mt-1 text-sm text-slate-400">
          Control email and WhatsApp notifications for rent bills and tenant messages.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="text-slate-400">Loading notification settings…</p>
      ) : data ? (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-white">Email</h2>
              <EnabledBadge enabled={data.settings.emailEnabled} />
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-300">
              <p>
                Resend API:{" "}
                <span className={data.email.configured ? "text-emerald-400" : "text-amber-300"}>
                  {data.email.configured ? "Configured" : "Not configured"}
                </span>
              </p>
              {data.email.fromAddress ? (
                <p>
                  From address: <span className="text-slate-200">{data.email.fromAddress}</span>
                </p>
              ) : null}
              {!data.email.configured ? (
                <p className="text-slate-500">
                  Set <code className="text-slate-400">RESEND_API_KEY</code> in environment variables
                  to send email.
                </p>
              ) : null}
            </div>

            {grants.canUpdate ? (
              <div className="mt-4">
                <ToggleRow
                  label="Enable email notifications"
                  description="Send rent bills and tenant login details by email when configured."
                  enabled={data.settings.emailEnabled}
                  disabled={saving}
                  onChange={(emailEnabled) => void patchSettings({ emailEnabled })}
                />
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-medium text-white">WhatsApp</h2>
              <EnabledBadge enabled={data.settings.whatsappEnabled} />
            </div>

            {data.whatsapp.hostedOnVercel ? (
              <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                WhatsApp requires Chrome and a persistent session. It cannot send messages on Vercel
                serverless. You can still toggle the setting; use a Node host with Chrome for live
                sending.
              </div>
            ) : null}

            {grants.canUpdate ? (
              <div className="mt-4">
                <ToggleRow
                  label="Enable WhatsApp notifications"
                  description="Send rent bill images and tenant login details on WhatsApp."
                  enabled={data.settings.whatsappEnabled}
                  disabled={saving}
                  onChange={(whatsappEnabled) => void patchSettings({ whatsappEnabled })}
                />
              </div>
            ) : null}

            {data.settings.whatsappEnabled ? (
              <div className="mt-6 border-t border-slate-800 pt-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-slate-400">Connection</span>
                  <span
                    className={`text-base font-medium ${WHATSAPP_STATUS_COLORS[data.whatsapp.status]}`}
                  >
                    {WHATSAPP_STATUS_LABELS[data.whatsapp.status]}
                  </span>
                  {data.whatsapp.linkedPhone ? (
                    <span className="rounded bg-slate-800 px-2 py-1 text-sm text-slate-300">
                      +{data.whatsapp.linkedPhone}
                    </span>
                  ) : null}
                </div>

                {data.whatsapp.error ? (
                  <p className="mt-3 text-sm text-red-300">{data.whatsapp.error}</p>
                ) : null}

                {data.whatsapp.status === "qr" && data.whatsapp.qrDataUrl ? (
                  <div className="mt-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.whatsapp.qrDataUrl}
                      alt="WhatsApp QR code"
                      className="rounded-xl border border-slate-700 bg-white p-3"
                    />
                    <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
                      <li>Open WhatsApp on the manager phone.</li>
                      <li>Go to Settings → Linked devices → Link a device.</li>
                      <li>Scan this QR code before it expires.</li>
                    </ol>
                  </div>
                ) : null}

                {data.whatsapp.status === "ready" ? (
                  <p className="mt-4 text-sm text-emerald-300">
                    WhatsApp is connected and ready to send notifications.
                  </p>
                ) : null}

                {!data.whatsapp.runtimeAvailable && !data.whatsapp.hostedOnVercel ? (
                  <p className="mt-4 text-sm text-amber-200">
                    Install Chrome on the server and set{" "}
                    <code className="text-amber-100">PUPPETEER_EXECUTABLE_PATH</code>, then enable
                    WhatsApp and reconnect.
                  </p>
                ) : null}

                {grants.canUpdate && data.whatsapp.runtimeAvailable ? (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={buttonSecondaryClass}
                      disabled={saving}
                      onClick={() => void patchSettings({ whatsappAction: "reconnect" })}
                    >
                      Reconnect
                    </button>
                    <button
                      type="button"
                      className={buttonSecondaryClass}
                      disabled={saving}
                      onClick={() => {
                        if (!window.confirm("Log out WhatsApp and unlink this device?")) return;
                        void patchSettings({ whatsappAction: "logout" });
                      }}
                    >
                      Log out &amp; scan again
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Enable WhatsApp above to link the manager phone and send notifications.
              </p>
            )}
          </section>

          <button
            type="button"
            className={buttonPrimaryClass}
            disabled={saving}
            onClick={() => void load()}
          >
            Refresh
          </button>
        </div>
      ) : null}
    </div>
  );
}
