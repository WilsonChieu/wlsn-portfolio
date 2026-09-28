import { slugify, uniqueId } from "@/lib/slug";

const baseName = (name: string) => name.replace(/\.[^.]+$/, "");

// Retried files keep the id they were first given, so a commit that succeeded but whose response was
// lost is replaced on the server instead of being added a second time.
export function assignPhotoIds<T>(
  files: T[],
  nameOf: (file: T) => string,
  taken: Set<string>,
  known: Map<T, string>
): Map<T, string> {
  const used = new Set(taken);
  for (const file of files) {
    const id = known.get(file);
    if (id) used.add(id);
  }
  const ids = new Map<T, string>();
  for (const file of files) {
    let id = known.get(file);
    if (!id) {
      id = uniqueId(slugify(baseName(nameOf(file))), used);
      used.add(id);
    }
    ids.set(file, id);
  }
  return ids;
}
