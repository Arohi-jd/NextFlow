export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.Gemini_API_Key
  );
}

export function getGroqApiKey(): string | undefined {
  return process.env.GROQ_API_KEY;
}

export function getTransloaditConfig(): { authKey: string; authSecret: string } | null {
  const authKey = process.env.TRANSLOADIT_AUTH_KEY;
  const authSecret = process.env.TRANSLOADIT_AUTH_SECRET;

  if (!authKey || !authSecret) {
    return null;
  }

  return { authKey, authSecret };
}
