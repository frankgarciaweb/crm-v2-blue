import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type UploadPayload = {
  publicUrl: string;
  fileName?: string;
};

type FileUploadNextcloudProps = {
  onUploadSuccess?: (payload: UploadPayload) => void;
};

export default function FileUploadNextcloud({ onUploadSuccess }: FileUploadNextcloudProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState('');

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    const publicUrl = URL.createObjectURL(file);
    setStatus(file.name);
    onUploadSuccess?.({ publicUrl, fileName: file.name });
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
    </div>
  );
}

