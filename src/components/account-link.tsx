import { PersonLink } from "@/components/person";

export function AccountLink({ id, name }: { id: string | null; name?: string }) {
  return id ? <PersonLink id={id} name={name ?? "Account"} /> : <span className="text-ink-3">Deleted account</span>;
}
