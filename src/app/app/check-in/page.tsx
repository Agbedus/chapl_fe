import { redirect } from "next/navigation";

/** Renamed to Live service. Old links, bookmarks and notifications land there. */
export default function CheckInPage() {
  redirect("/app/live");
}
