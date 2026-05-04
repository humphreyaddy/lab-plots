import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';

type Props = {
  onFile: (file: File) => void;
  accept: string;
  hint: string;
  fileName?: string | null;
};

export function FileDropzone({ onFile, accept, hint, fileName }: Props) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback(
    (f: FileList | null) => {
      if (!f || f.length === 0) return;
      onFile(f[0]);
    },
    [onFile],
  );

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files);
      }}
      className={[
        'w-full rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        over ? 'border-ink-700 bg-ink-100' : 'border-ink-200 bg-white hover:bg-ink-50',
      ].join(' ')}
    >
      <Upload className="mx-auto mb-2 h-6 w-6 text-ink-500" aria-hidden />
      <div className="text-sm font-medium">
        {fileName ? `Loaded: ${fileName}` : 'Drop a file or click to browse'}
      </div>
      <div className="mt-1 text-xs text-ink-500">{hint}</div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => handle(e.target.files)}
        className="hidden"
      />
    </button>
  );
}
