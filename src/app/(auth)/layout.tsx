import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-white">
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
