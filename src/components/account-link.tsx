import Link from "next/link";

export function AccountLink({ id, name }: { id: string | null; name?: string }) {
  return id ? <Link href={`/app/people/${id}`} className="font-medium text-ink hover:underline">{name ?? "Account"}</Link> : <span className="text-ink-3">Deleted account</span>;
}
