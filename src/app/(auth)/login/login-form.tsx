"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { buttonPrimaryClass, cardClass, COMPANY_NAME, inputClass } from "@/components/auth/ui";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const registered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (result?.error) {
      setError(
        result.error === "CredentialsSignin" ? "Invalid credentials" : result.error,
      );
      return;
    }

    const session = await getSession();
    const destination = session?.user?.mustChangePassword ? "/change-password" : callbackUrl;
    router.push(destination);
    router.refresh();
  }

  return (
    <div className={cardClass}>
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-400">
          {COMPANY_NAME}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Sign in</h1>
        <p className="mt-2 text-sm text-slate-400">
          Use your credentials to access your dashboard.
        </p>
      </div>

      {registered ? (
        <p className="mb-5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          Account created successfully. Please sign in.
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="mb-2 block text-sm text-slate-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={inputClass}
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button type="submit" disabled={loading} className={buttonPrimaryClass}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-emerald-400 hover:text-emerald-300">
          Register
        </Link>
      </p>
    </div>
  );
}
