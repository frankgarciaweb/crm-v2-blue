import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { uploadFile } from '@/services/storageService';

type UploadPayload = {
  publicUrl: string;
  fileName?: string;
};

type FileUploadNextcloudProps = {
  onUploadSuccess?: (payload: UploadPayload) => void;
  folder?: string;
};

export default function FileUploadNextcloud({ onUploadSuccess, folder = 'pedidos/disenos' }: FileUploadNextcloudProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setError('');
    setStatus('Subiendo...');
    try {
      const publicUrl = await uploadFile(file, folder, file.name);
      setStatus(file.name);
      onUploadSuccess?.({ publicUrl, fileName: file.name });
    } catch (err: any) {
      setStatus('');
      setError(err?.message || 'No se pudo subir el archivo');
    }
  };

  return (
    <div className="space-y-3">
      <Input
        ref={inputRef}
        type="file"
        onChange={e => handleFile(e.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
        Seleccionar archivo
      </Button>
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
