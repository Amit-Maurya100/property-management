import { Suspense } from "react";
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-md rounded-2xl bg-slate-900" />}>
      <RegisterForm />
    </Suspense>
  );
}
