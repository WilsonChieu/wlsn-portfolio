export const ACCEPTED_FILE = /\.(jpe?g|png|webp|gif|heic|heif)$/i;

export interface PathedFile<T> {
  path: string;
  file: T;
}

export interface FileGroup<T> {
  name: string;
  files: T[];
}

const natural = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });

export function groupFiles<T>(
  items: PathedFile<T>[],
  mode: "by-folder" | "single"
): { groups: FileGroup<T>[]; skipped: string[] } {
  const skipped: string[] = [];
  const byName = new Map<string, PathedFile<T>[]>();

  for (const item of items) {
    const parts = item.path.split("/").filter(Boolean);
    const fileName = parts[parts.length - 1] ?? "";
    if (fileName.startsWith(".") || !ACCEPTED_FILE.test(fileName)) {
      skipped.push(item.path);
      continue;
    }
    const name = mode === "by-folder" && parts.length > 1 ? parts[0] : "";
    byName.set(name, [...(byName.get(name) ?? []), item]);
  }

  const groups = [...byName.entries()]
    .sort(([a], [b]) => natural(a, b))
    .map(([name, files]) => ({ name, files: files.sort((a, b) => natural(a.path, b.path)).map((f) => f.file) }));
  return { groups, skipped: skipped.sort(natural) };
}

export async function filesFromDataTransfer(dt: DataTransfer): Promise<PathedFile<File>[]> {
  // Entries must be read before the first await: the browser empties the DataTransfer once the drop handler yields.
  const entries = Array.from(dt.items)
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => entry !== null);
  const out: PathedFile<File>[] = [];
  await Promise.all(entries.map((entry) => walk(entry, "", out)));
  return out;
}

async function walk(entry: FileSystemEntry, parent: string, out: PathedFile<File>[]): Promise<void> {
  const path = parent ? `${parent}/${entry.name}` : entry.name;
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) => (entry as FileSystemFileEntry).file(resolve, reject));
    out.push({ path, file });
    return;
  }
  if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    // readEntries returns results in batches (about 100 in Chrome); keep reading until it returns none.
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => reader.readEntries(resolve, reject));
      if (batch.length === 0) break;
      await Promise.all(batch.map((child) => walk(child, path, out)));
    }
  }
}

export function filesFromInput(list: FileList): PathedFile<File>[] {
  return Array.from(list, (file) => ({ path: file.webkitRelativePath || file.name, file }));
}
