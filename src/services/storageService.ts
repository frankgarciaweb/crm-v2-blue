import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const STORAGE_ENDPOINT = import.meta.env.VITE_STORAGE_ENDPOINT || '';
const STORAGE_BUCKET = import.meta.env.VITE_STORAGE_BUCKET || 'crm-archivos';
const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_BASE_URL || '';
const STORAGE_ACCESS_KEY = import.meta.env.VITE_STORAGE_ACCESS_KEY || '';
const STORAGE_SECRET_KEY = import.meta.env.VITE_STORAGE_SECRET_KEY || '';

const STORAGE_ENABLED = Boolean(
  STORAGE_ENDPOINT && STORAGE_BASE_URL && STORAGE_ACCESS_KEY && STORAGE_SECRET_KEY,
);

const s3 = STORAGE_ENABLED
  ? new S3Client({
      endpoint: STORAGE_ENDPOINT,
      region: 'us-east-1',
      forcePathStyle: true,
      credentials: {
        accessKeyId: STORAGE_ACCESS_KEY,
        secretAccessKey: STORAGE_SECRET_KEY,
      },
    })
  : null;

function sanitizeSegment(value: string) {
  return value
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_.\-\/]/g, '_');
}

function sanitizeFileName(value: string) {
  return value.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_.\-]/g, '_');
}

function buildKey(path: string | undefined, fileName: string) {
  const folder = sanitizeSegment(path || 'uploads') || 'uploads';
  const safeName = sanitizeFileName(fileName || 'archivo.bin');
  return `${folder}/${Date.now()}_${safeName}`;
}

function buildPublicUrl(key: string) {
  return `${STORAGE_BASE_URL.replace(/\/+$/, '')}/${key}`;
}

export function isStorageConfigured() {
  return STORAGE_ENABLED;
}

export async function uploadFile(file: Blob, path?: string, fileName?: string): Promise<string> {
  if (!s3) {
    throw new Error('Storage no configurado. Define las variables VITE_STORAGE_* para usar MinIO.');
  }

  const name =
    fileName ||
    (typeof File !== 'undefined' && file instanceof File ? file.name : 'archivo.bin');
  const key = buildKey(path, name);
  const buffer = new Uint8Array(await file.arrayBuffer());
  const contentType =
    (typeof File !== 'undefined' && file instanceof File && file.type) ||
    (file.type || 'application/octet-stream');

  await s3.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read' as any,
  }));

  return buildPublicUrl(key);
}
