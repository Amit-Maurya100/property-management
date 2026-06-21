import { redirect } from "next/navigation";

export default function BuildingsPage() {
  redirect("/properties?tab=buildings");
}
