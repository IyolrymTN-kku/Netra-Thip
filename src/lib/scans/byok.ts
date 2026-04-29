import "server-only";
import { prisma } from "@/lib/db/prisma";
import { encrypt } from "@/lib/security/encryption";
import type { ToolDef } from "@/lib/tools/registry";

export interface PersistedSecret {
  fieldId: string;
  provider: string;
  rawValue: string;
}

function inferProvider(
  tool: ToolDef,
  fieldId: string,
  params: Record<string, unknown>,
): string {
  const aiProvider = params.ai_provider;
  if (
    fieldId === "ai_api_key" &&
    typeof aiProvider === "string" &&
    aiProvider.trim() !== ""
  ) {
    return aiProvider;
  }
  if (fieldId.endsWith("_api_key")) {
    return fieldId.slice(0, -"_api_key".length);
  }
  return `${tool.id}_${fieldId}`;
}

export function extractSecrets(
  tool: ToolDef,
  params: Record<string, unknown>,
): PersistedSecret[] {
  const out: PersistedSecret[] = [];
  for (const f of tool.fields) {
    if (f.type !== "secret") continue;
    const raw = params[f.id];
    if (typeof raw !== "string" || raw.trim() === "") continue;
    out.push({
      fieldId: f.id,
      provider: inferProvider(tool, f.id, params),
      rawValue: raw,
    });
  }
  return out;
}

// Encrypt with AES-256-GCM and upsert keyed on (projectId, provider).
// Submitting a fresh value for the same provider replaces the previous record.
export async function persistSecrets(
  projectId: string,
  secrets: PersistedSecret[],
): Promise<void> {
  for (const s of secrets) {
    const { ciphertext, iv, authTag } = encrypt(s.rawValue);
    await prisma.apiKey.upsert({
      where: { projectId_provider: { projectId, provider: s.provider } },
      update: { encryptedKey: ciphertext, iv, authTag },
      create: {
        projectId,
        provider: s.provider,
        encryptedKey: ciphertext,
        iv,
        authTag,
      },
    });
  }
}

// Build the in-memory plaintext map handed to the n8n trigger. Never persisted.
export function secretsToPlaintextMap(
  secrets: PersistedSecret[],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of secrets) out[s.fieldId] = s.rawValue;
  return out;
}
