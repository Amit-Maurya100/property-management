import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDefaultHomePath } from "@/lib/navigation/nav";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  redirect(await getDefaultHomePath(session));
}
