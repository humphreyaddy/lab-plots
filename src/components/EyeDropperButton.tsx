import { Pipette } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * Browser EyeDropper API (Chrome / Edge / Opera 95+, Safari/Firefox unsupported).
 * `EyeDropper().open()` lets the user click anywhere on screen — including
 * other browser tabs and other applications — and returns the picked color
 * as `{ sRGBHex }`. The user can press Escape to cancel.
 */
type EyeDropperApi = {
  open(options?: { signal?: AbortSignal }): Promise<{ sRGBHex: string }>;
};

declare global {
  interface Window {
    EyeDropper?: new () => EyeDropperApi;
  }
}

type Props = {
  onPick: (hex: string) => void;
  ariaLabel?: string;
};

export function EyeDropperButton({ onPick, ariaLabel }: Props) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && typeof window.EyeDropper === 'function');
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      title="Pick a color from anywhere on your screen — images, other tabs, anywhere"
      aria-label={ariaLabel ?? 'Pick a color from screen'}
      disabled={busy}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-ink-200 bg-white text-ink-500 hover:bg-ink-50 hover:text-ink-700 disabled:opacity-50"
      onClick={async () => {
        if (!window.EyeDropper) return;
        setBusy(true);
        try {
          const dropper = new window.EyeDropper();
          const result = await dropper.open();
          onPick(result.sRGBHex);
        } catch {
          // user cancelled (Escape) or the API rejected — silently ignore.
        } finally {
          setBusy(false);
        }
      }}
    >
      <Pipette className="h-4 w-4" />
    </button>
  );
}
