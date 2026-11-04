export async function sendJson<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export async function putBlob(url: string, body: Blob, contentType: string): Promise<void> {
  const res = await fetch(url, { method: "PUT", body, headers: { "Content-Type": contentType } });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
}
