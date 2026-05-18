import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadSTLToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
): Promise<{ publicId: string; url: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "printkaro/stl-files",
        resource_type: "raw",
        public_id: `stl_${Date.now()}_${fileName.replace(/\s+/g, "_")}`,
        use_filename: false,
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ publicId: result.public_id, url: result.secure_url });
      },
    );
    uploadStream.end(fileBuffer);
  });
}

export async function uploadPhotoToCloudinary(
  fileBuffer: Buffer,
  orderId: string,
): Promise<{ publicId: string; url: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "printkaro/completion-photos",
        resource_type: "image",
        public_id: `order_${orderId}_${Date.now()}`,
        transformation: [{ width: 1200, crop: "limit" }, { quality: "auto" }],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Upload failed"));
        resolve({ publicId: result.public_id, url: result.secure_url });
      },
    );
    uploadStream.end(fileBuffer);
  });
}

export { cloudinary };
