"use server";

export type Passage = {
  reference: string;
  verses: { verse: number; text: string }[];
};

/**
 * A passage of the King James Version, for the screen at the front.
 *
 * The KJV because it is public domain (the same reason the landing page
 * quotes it): a modern translation on a church's wall is someone's
 * copyright. Read from bible-api.com on the server, sending nothing but
 * the reference, and cached, because a verse does not change. Returns
 * null for a reference it cannot find, so the form can say so.
 */
export async function lookUpScripture(reference: string): Promise<Passage | null> {
  const ref = reference.trim().slice(0, 60);
  if (!ref) return null;
  try {
    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`,
      { next: { revalidate: 60 * 60 * 24 * 30 } },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      reference?: string;
      verses?: { verse: number; text: string }[];
    };
    if (!data.verses?.length) return null;
    return {
      reference: data.reference ?? ref,
      verses: data.verses.slice(0, 40).map((v) => ({ verse: v.verse, text: v.text.replace(/\s+/g, " ").trim() })),
    };
  } catch {
    return null;
  }
}
