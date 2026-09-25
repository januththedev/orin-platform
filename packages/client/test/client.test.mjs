import test from "node:test";
import assert from "node:assert/strict";
import { RouterClient, ToolsSearchClient, readSse } from "../dist/index.js";

const fakeFetch = async (url, init) => new Response(JSON.stringify({ ok: true, path: new URL(url).pathname, method: init?.method ?? "GET", headers: Object.fromEntries(new Headers(init?.headers)) }), { status: 200, headers: { "content-type": "application/json", "x-request-id": "req_test_123456789" } });
test("Router client rejects raw model before fetch", async () => {
  let called = false;
  const client = new RouterClient({ baseUrl: "https://router.example", fetch: async (...args) => { called = true; return fakeFetch(...args); } });
  await assert.rejects(() => client.chat({ model: "openrouter/free", messages: [] }));
  assert.equal(called, false);
});
test("Tools private search uses POST and no query URL", async () => {
  const client = new ToolsSearchClient({ baseUrl: "https://tools.example", fetch: fakeFetch });
  const result = await client.searchPrivate({ query: "private", n: 5 }, "assertion");
  assert.equal(result.path, "/api/search");
  assert.equal(result.method, "POST");
  assert.equal(result.headers["x-orin-service-assertion"], "assertion");
});
test("SSE parser joins multiline and emits final buffer", async () => {
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode("data: one\ndata: two\n\n")); controller.enqueue(new TextEncoder().encode("data: final")); controller.close(); } });
  const events = [];
  for await (const event of readSse(stream)) events.push(event.data);
  assert.deepEqual(events, ["one\ntwo", "final"]);
});
