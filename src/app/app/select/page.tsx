import { redirect } from "next/navigation";

/**
 * Gone: churches are switched from the side nav, the top bar and the
 * account page. Old links and bookmarks land on the dashboard.
 */
export default function SelectPage() {
  redirect("/app");
}
