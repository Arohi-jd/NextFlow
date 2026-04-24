import { NextResponse } from "next/server";
import { getAppAuthUser } from "@/lib/auth";
import { uploadFileToTransloadit } from "@/lib/transloadit";

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

    if (mediaType === "image" && !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Expected an image upload" }, { status: 400 });
    }

    if (mediaType === "video" && !file.type.startsWith("video/")) {
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
