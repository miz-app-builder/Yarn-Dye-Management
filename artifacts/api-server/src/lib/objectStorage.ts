import { randomUUID } from "crypto";
import { supabaseAdmin } from "./supabaseAdmin";

const BUCKET_NAME = process.env.SUPABASE_STORAGE_BUCKET || "uploads";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  private get bucket() {
    return supabaseAdmin.storage.from(BUCKET_NAME);
  }

  async getObjectEntityUploadURL(): Promise<{ uploadURL: string; objectPath: string }> {
    const objectId = randomUUID();
    const storagePath = `uploads/${objectId}`;

    const { data, error } = await this.bucket.createSignedUploadUrl(storagePath);
    if (error || !data) {
      throw new Error(`Failed to create signed upload URL: ${error?.message}`);
    }

    return {
      uploadURL: data.signedUrl,
      objectPath: `/objects/${storagePath}`,
    };
  }

  async downloadPublicObject(filePath: string): Promise<Response | null> {
    const storagePath = `public/${filePath}`;
    const { data, error } = await this.bucket.download(storagePath);
    if (error || !data) return null;

    return new Response(data, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  async downloadObject(objectPath: string): Promise<Response> {
    const storagePath = objectPath.replace(/^\/objects\//, "");

    const { data, error } = await this.bucket.download(storagePath);
    if (error || !data) {
      throw new ObjectNotFoundError();
    }

    return new Response(data, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  }

  async objectExists(objectPath: string): Promise<boolean> {
    const storagePath = objectPath.replace(/^\/objects\//, "");
    const parts = storagePath.split("/");
    const folder = parts.slice(0, -1).join("/") || "";
    const fileName = parts[parts.length - 1];

    const { data, error } = await this.bucket.list(folder, { search: fileName });
    if (error) return false;
    return data?.some((f) => f.name === fileName) ?? false;
  }
}
