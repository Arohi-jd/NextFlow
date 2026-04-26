import { NextResponse } from "next/server";
import { getAppAuthUser } from "@/lib/auth";
import { uploadFileToTransloadit } from "@/lib/transloadit";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "tiff", "heic", "heif"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "webm", "avi", "mkv", "m4v", "ogv", "3gp"]);

function extensionFromName(name: string): string | null {
  const extension = name.split(".").pop()?.toLowerCase();
  return extension && extension.length > 0 ? extension : null;
}

function isImageUpload(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  const extension = extensionFromName(file.name);
  return Boolean(extension && IMAGE_EXTENSIONS.has(extension));
}

function isVideoUpload(file: File): boolean {
  if (file.type.startsWith("video/")) return true;
  const extension = extensionFromName(file.name);
  return Boolean(extension && VIDEO_EXTENSIONS.has(extension));
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getAppAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const mediaType = String(formData.get("mediaType") ?? "");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
    }

    if (mediaType === "image" && !isImageUpload(file)) {
      return NextResponse.json({ error: "Expected an image upload" }, { status: 400 });
    }

    if (mediaType === "video" && !isVideoUpload(file)) {
      return NextResponse.json({ error: "Expected a video upload" }, { status: 400 });
    }

    const uploaded = await uploadFileToTransloadit(file);

    return NextResponse.json({
      url: uploaded.url,
      fileName: uploaded.name,
      fileSize: file.size
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload file to Transloadit"
      },
      { status: 500 }
    );
  }
}
