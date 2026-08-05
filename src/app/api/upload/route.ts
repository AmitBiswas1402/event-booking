import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireRole } from "@/lib/authorization";

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true,
});

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const access = await requireRole("ORGANIZER", "ADMIN");
    if (access.status) {
      return NextResponse.json(
        { error: access.status === 401 ? "Authentication required" : "Organizer access required" },
        { status: access.status }
      );
    }

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { error: "Cloudinary config missing" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, WEBP, GIF and AVIF images are allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image must be under 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const data = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "events",
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Upload failed"));
            return;
          }

          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
          });
        }
      );

      uploadStream.end(buffer);
    });

    return NextResponse.json({
      url: data.secure_url,
      publicId: data.public_id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
