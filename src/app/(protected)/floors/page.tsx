import { redirect } from "next/navigation";

export default function FloorsPage() {
  redirect("/properties?tab=floors");
}
