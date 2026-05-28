import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type FileUploadProps = {
  onUploadSuccess?: (url: string) => void;
  accept?: string;
  label?: string;
  className?: string;
};

export default function FileUpload({
  onUploadSuccess,
  accept = '*/*',
  label = 'Seleccionar archivo',
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const publicUrl = URL.createObjectURL(file);
    onUploadSuccess?.(publicUrl);
  };

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={e => handleFile(e.target.files?.[0] ?? null)}
        />
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          {label}
        </Button>
      </div>
      {fileName ? <p className="mt-2 text-xs text-muted-foreground">{fileName}</p> : null}
    </div>
  );
}

