import { createHmac, randomUUID } from "node:crypto";
import { getTransloaditConfig } from "@/lib/env";

type JsonRecord = Record<string, unknown>;

type AssemblyStatus = {
  ok?: string;
  error?: string;
  message?: string;
  assembly_id?: string;
  assembly_ssl_url?: string;
  uploads?: Array<{ ssl_url?: string; url?: string; name?: string }>;
  results?: Record<string, Array<{ ssl_url?: string; url?: string; name?: string }>>;
};

type CreateAssemblyOptions = {
  steps: JsonRecord;
  waitForCompletion?: boolean;
  fields?: Record<string, string>;
  file?: File;
};

const TRANSLOADIT_ASSEMBLIES_URL = "https://api2.transloadit.com/assemblies";
const ACTIVE_ASSEMBLY_STATES = new Set(["ASSEMBLY_UPLOADING", "ASSEMBLY_EXECUTING"]);

function getRequiredConfig(): { authKey: string; authSecret: string } {
  const config = getTransloaditConfig();
  if (!config) {
    throw new Error("Missing Transloadit configuration");
  }

  return config;
}

function buildParams(steps: JsonRecord, fields?: Record<string, string>): string {
  const { authKey } = getRequiredConfig();

  return JSON.stringify({
    auth: {
      key: authKey,
      expires: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      nonce: randomUUID()
    },
    steps,
    fields,
    notify_url: null
  });
}

function signParams(params: string): string {
  const { authSecret } = getRequiredConfig();
  const digest = createHmac("sha384", authSecret).update(params).digest("hex");
  return `sha384:${digest}`;
}

async function pollAssemblyStatus(assemblyUrl: string): Promise<AssemblyStatus> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const response = await fetch(assemblyUrl, {
      method: "GET",
      cache: "no-store"
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Failed to fetch Transloadit assembly status: ${details}`);
    }

    const status = (await response.json()) as AssemblyStatus;

    if (status.error) {
      throw new Error(status.message ?? status.error);
    }

    if (!status.ok || !ACTIVE_ASSEMBLY_STATES.has(status.ok)) {
      return status;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timed out waiting for Transloadit assembly to complete");
}

function firstResultUrl(status: AssemblyStatus, stepName?: string): string | undefined {
  if (stepName) {
    const result = status.results?.[stepName]?.[0];
    return result?.ssl_url ?? result?.url;
  }

  const upload = status.uploads?.[0];
  return upload?.ssl_url ?? upload?.url;
}

export async function createAssembly(options: CreateAssemblyOptions): Promise<AssemblyStatus> {
  const params = buildParams(options.steps, options.fields);
  const signature = signParams(params);
  const body = new FormData();

  body.set("params", params);
  body.set("signature", signature);

  if (options.file) {
    body.set("file", options.file, options.file.name);
  }

  const response = await fetch(TRANSLOADIT_ASSEMBLIES_URL, {
    method: "POST",
    body
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to create Transloadit assembly: ${details}`);
  }

  const assembly = (await response.json()) as AssemblyStatus;

  if (assembly.error) {
    throw new Error(assembly.message ?? assembly.error);
  }

  if (!options.waitForCompletion) {
    return assembly;
  }

  const assemblyUrl = assembly.assembly_ssl_url;
  if (!assemblyUrl) {
    throw new Error("Transloadit did not return an assembly status URL");
  }

  return pollAssemblyStatus(assemblyUrl);
}

export async function uploadFileToTransloadit(file: File): Promise<{ url: string; name: string }> {
  const status = await createAssembly({
    waitForCompletion: true,
    file,
    steps: {
      ":original": {
        robot: "/upload/handle"
      }
    }
  });

  const url = firstResultUrl(status) ?? firstResultUrl(status, ":original");
  if (!url) {
    throw new Error("Transloadit upload completed without a hosted file URL");
  }

  return {
    url,
    name: status.uploads?.[0]?.name ?? file.name
  };
}

export async function cropImageWithTransloadit(inputUrl: string, crop: {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}): Promise<string> {
  const x1 = `${crop.xPercent}%`;
  const y1 = `${crop.yPercent}%`;
  const x2 = `${Math.min(100, crop.xPercent + crop.widthPercent)}%`;
  const y2 = `${Math.min(100, crop.yPercent + crop.heightPercent)}%`;

  const status = await createAssembly({
    waitForCompletion: true,
    steps: {
      imported: {
        robot: "/http/import",
        url: inputUrl
      },
      cropped: {
        robot: "/image/resize",
        use: "imported",
        result: true,
        crop: {
          x1,
          y1,
          x2,
          y2
        }
      }
    }
  });

  const outputUrl = firstResultUrl(status, "cropped");
  if (!outputUrl) {
    throw new Error("Transloadit crop completed without an output URL");
  }

  return outputUrl;
}

export async function extractFrameWithTransloadit(videoUrl: string, timestamp: string): Promise<string> {
  const status = await createAssembly({
    waitForCompletion: true,
    steps: {
      imported: {
        robot: "/http/import",
        url: videoUrl
      },
      frame: {
        robot: "/video/thumbs",
        use: "imported",
        result: true,
        ffmpeg_stack: "v6.0.0",
        offsets: [timestamp],
        format: "jpg"
      }
    }
  });

  const outputUrl = firstResultUrl(status, "frame");
  if (!outputUrl) {
    throw new Error("Transloadit frame extraction completed without an output URL");
  }

  return outputUrl;
}
