import "server-only";

import { randomBytes } from "node:crypto";

const firstWords = ["terry", "milo", "archie", "jules", "oscar", "nora", "ivy", "leo"];
const middleWords = ["bobby", "river", "robin", "sunny", "morgan", "taylor", "bailey", "riley"];
const lastWords = ["black", "stone", "wood", "field", "cloud", "north", "lake", "moss"];

export function isValidVmSlug(slug: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+){2,3}$/.test(slug);
}

function pick(words: readonly string[]) {
  return words[randomBytes(1)[0] % words.length];
}

export function createVmSlugCandidate() {
  return `${pick(firstWords)}-${pick(middleWords)}-${pick(lastWords)}`;
}

export async function generateUniqueVmSlug(isAvailable: (slug: string) => Promise<boolean>) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = createVmSlugCandidate();
    if (await isAvailable(slug)) return slug;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const slug = `${createVmSlugCandidate()}-${randomBytes(3).toString("hex")}`;
    if (await isAvailable(slug)) return slug;
  }

  throw new Error("Unable to allocate a unique virtual machine name.");
}
