export async function uploadFile(file: File, _path?: string): Promise<string> {
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    return URL.createObjectURL(file);
  }
  return `file://${file.name}`;
}
