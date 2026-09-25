import Ajv2020Import from "ajv/dist/2020.js";
import addFormatsImport from "ajv-formats";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type AjvConstructor = new (options: Record<string, unknown>) => {
  addSchema(schema: unknown): void;
  getSchema(id: string): unknown;
  compile(schema: unknown): ((value: unknown) => boolean) & { errors?: unknown[] };
};
const Ajv2020 = ((Ajv2020Import as unknown as { default?: AjvConstructor }).default ?? (Ajv2020Import as unknown as AjvConstructor));
const addFormats = ((addFormatsImport as unknown as { default?: (ajv: unknown) => void }).default ?? (addFormatsImport as unknown as (ajv: unknown) => void));

const schemaDir = join(dirname(fileURLToPath(import.meta.url)), "../schemas");
const schemaFiles = ["common.v1.schema.json", "tokens.v1.schema.json", "models.v1.schema.json", "events.v1.schema.json", "errors.v1.schema.json", "router.v1.schema.json", "search.v1.schema.json", "chat.v1.schema.json", "provider-processing.v1.schema.json"];
const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
addFormats(ajv);
for (const file of schemaFiles) ajv.addSchema(JSON.parse(await readFile(join(schemaDir, file), "utf8")));
const validators = new Map<string, ((value: unknown) => boolean) & { errors?: unknown[] }>();
export type ContractKind = "TokenClaimsV1" | "CatalogModelV1" | "EventEnvelopeV1" | "ErrorEnvelopeV1" | "ChatRequestV1" | "ImageGenerationRequestV1" | "SearchRequestV1" | "SearchResultV1" | "MessageV1" | "AttachmentV1" | "ProviderConsentV1";
const refs: Record<ContractKind, string> = {
  TokenClaimsV1: "https://schemas.orinai.org/platform/1.0.0/tokens.v1.schema.json#/$defs/TokenClaimsV1",
  CatalogModelV1: "https://schemas.orinai.org/platform/1.0.0/models.v1.schema.json#/$defs/CatalogModelV1",
  EventEnvelopeV1: "https://schemas.orinai.org/platform/1.0.0/events.v1.schema.json#/$defs/EventEnvelopeV1",
  ErrorEnvelopeV1: "https://schemas.orinai.org/platform/1.0.0/errors.v1.schema.json#",
  ChatRequestV1: "https://schemas.orinai.org/platform/1.0.0/router.v1.schema.json#/$defs/ChatRequestV1",
  ImageGenerationRequestV1: "https://schemas.orinai.org/platform/1.0.0/router.v1.schema.json#/$defs/ImageGenerationRequestV1",
  SearchRequestV1: "https://schemas.orinai.org/platform/1.0.0/search.v1.schema.json#/$defs/SearchRequestV1",
  SearchResultV1: "https://schemas.orinai.org/platform/1.0.0/search.v1.schema.json#/$defs/SearchResultV1",
  MessageV1: "https://schemas.orinai.org/platform/1.0.0/chat.v1.schema.json#/$defs/MessageV1",
  AttachmentV1: "https://schemas.orinai.org/platform/1.0.0/chat.v1.schema.json#/$defs/AttachmentV1",
  ProviderConsentV1: "https://schemas.orinai.org/platform/1.0.0/provider-processing.v1.schema.json#/$defs/ProviderConsentV1",
};
export function createContractValidator<T>(kind: ContractKind): (value: unknown) => value is T {
  let validator = validators.get(kind);
  if (!validator) {
    validator = ajv.compile({ $ref: refs[kind] });
    validators.set(kind, validator);
  }
  return ((value: unknown): value is T => validator!(value)) as (value: unknown) => value is T;
}
