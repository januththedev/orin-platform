export interface SseEvent { readonly event?: string; readonly id?: string; readonly data: string; }
export async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;
  while (!done) {
    const part = await reader.read();
    done = part.done;
    buffer += decoder.decode(part.value ?? new Uint8Array(), { stream: !done });
    let boundary: number;
    while ((boundary = buffer.search(/\r?\n\r?\n/)) >= 0) {
      const raw = buffer.slice(0, boundary);
      const match = buffer.slice(boundary).match(/^\r?\n\r?\n/);
      buffer = buffer.slice(boundary + (match?.[0].length ?? 0));
      const lines = raw.split(/\r?\n/);
      const data: string[] = [];
      let event: string | undefined; let id: string | undefined;
      for (const line of lines) {
        if (line.startsWith(":")) continue;
        const colon = line.indexOf(":"); const field = colon < 0 ? line : line.slice(0, colon); const value = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
        if (field === "data") data.push(value); else if (field === "event") event = value; else if (field === "id") id = value;
      }
      if (data.length) yield { event, id, data: data.join("\n") };
    }
  }
  if (buffer.trim()) {
    const data = buffer.split(/\r?\n/).filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trimStart()).join("\n");
    if (data) yield { data };
  }
}
