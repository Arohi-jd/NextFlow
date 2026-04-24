import { readFileSync } from "node:fs";
import { join } from "node:path";

function readLegacyEnvValue(key: string): string | undefined {
  try {
    const envPath = join(process.cwd(), ".env");
    const contents = readFileSync(envPath, "utf8");
    const line = contents
      .split(/\r?\n/)
      .find((entry) => entry.trim().startsWith(`${key}=`));

    if (!line) return undefined;

    const rawValue = line.slice(line.indexOf("=") + 1).trim();
    return rawValue.replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

export function getGeminiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.Gemini_API_Key ||
    process.env["Gemini API Key"] ||
    readLegacyEnvValue("Gemini_API_Key") ||
    readLegacyEnvValue("Gemini API Key")
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
