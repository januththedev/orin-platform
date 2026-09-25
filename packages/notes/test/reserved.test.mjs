import test from "node:test";
import assert from "node:assert/strict";
import { NOTES_CONTRACT_VERSION, NOTES_PARSER_AVAILABLE, addBlock, parseLogseqPage, serializeLogseqPage } from "../dist/index.js";

const source = `# Research\n\nowner:: Januth\n\n- First {{id:: block-001}} #weather\n  source:: https://example.com\n- Second\n  - Nested {{id:: block-002}}\n`;

test("notes contract is implemented", () => {
  assert.equal(NOTES_CONTRACT_VERSION, "1.0.0");
  assert.equal(NOTES_PARSER_AVAILABLE, true);
});

test("Logseq parser preserves properties, tags, IDs, and nesting", () => {
  const page = parseLogseqPage(source);
  assert.equal(page.title, "Research");
  assert.equal(page.properties.owner, "Januth");
  assert.equal(page.blocks[0].id, "block-001");
  assert.deepEqual(page.blocks[0].tags, ["weather"]);
  assert.equal(page.blocks[0].properties.source, "https://example.com");
  assert.equal(page.blocks[1].children[0].id, "block-002");
});

test("Logseq serializer round-trips stable IDs", () => {
  const page = parseLogseqPage(source);
  const roundTrip = parseLogseqPage(serializeLogseqPage(page));
  assert.deepEqual(roundTrip.blocks.map((block) => block.id), page.blocks.map((block) => block.id));
  assert.equal(roundTrip.blocks[1].children[0].content, "Nested");
});

test("new blocks get deterministic IDs", () => {
  const first = addBlock(parseLogseqPage("# Notes\n"), "Generated output", { source: "local" });
  const second = addBlock(parseLogseqPage("# Notes\n"), "Generated output", { source: "local" });
  assert.equal(first.blocks[0].id, second.blocks[0].id);
});
