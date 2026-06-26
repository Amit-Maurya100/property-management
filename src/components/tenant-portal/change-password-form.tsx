"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { buttonPrimaryClass, cardClass, COMPANY_NAME, inputClass } from "@/components/auth/ui";
import { fetchMutation } from "@/lib/api/client-cache";

export function ChangePasswordForm({ email }: { email: string }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await fetchMutation("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (email) {
        await signIn("credentials", {
          email,
          password: newPassword,
          redirect: false,
        });
      }

      router.push("/portal/profile");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cardClass}>
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
          {COMPANY_NAME}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Change password</h1>
        <p className="mt-2 text-sm text-slate-400">
          You must set a new password before continuing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input id="change-email" type="hidden" value={email} readOnly />

        <div>
          <label htmlFor="currentPassword" className="mb-2 block text-sm text-slate-300">
            Current password
          </label>
          <input
            id="currentPassword"
            type="password"
            required
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="mb-2 block text-sm text-slate-300">
            New password
          </label>
          <input
            id="newPassword"
            type="password"
            minLength={8}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm text-slate-300">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className={buttonPrimaryClass}>
          {loading ? "Saving..." : "Update password"}
        </button>
      </form>
    </div>
  );
}
