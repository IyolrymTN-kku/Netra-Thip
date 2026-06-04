export interface AiProviderMetadata {
  model?: string;
  baseUrl?: string;
}

export interface SavedApiKeyConfig {
  provider: string;
  metadata?: AiProviderMetadata | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface SavedApiKeySecret extends SavedApiKeyConfig {
  encryptedKey: string;
  iv: string;
  authTag: string;
}

export function getAiProviderMetadata(value: unknown): AiProviderMetadata | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    model: typeof record.model === "string" ? record.model : undefined,
    baseUrl: typeof record.baseUrl === "string" ? record.baseUrl : undefined,
  };
}
