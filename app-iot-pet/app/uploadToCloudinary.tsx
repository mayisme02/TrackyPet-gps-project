export const CLOUD_NAME = 'dhm7ececc';
export const UPLOAD_PRESET = 'ml_default';
export const FOLDER = 'picture';

export type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  width: number;
  height: number;
};

export async function uploadToCloudinary(localUri: string): Promise<CloudinaryUploadResult> {
  const data = new FormData();
  data.append('file', { uri: localUri, name: `avatar_${Date.now()}.jpg`, type: 'image/jpeg' } as any);
  data.append('upload_preset', UPLOAD_PRESET);
  if (FOLDER) data.append('folder', FOLDER);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: data, // อย่าตั้ง Content-Type เอง ให้ RN จัดการ
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || 'Cloudinary upload failed');
  }
  return {
    secure_url: json.secure_url,
    public_id: json.public_id,
    width: json.width,
    height: json.height,
  };
}