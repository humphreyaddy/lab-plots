/** Filename-safe slug. */
export function safeFileName(s: string): string {
  return (
    s
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 60) || 'unnamed'
  );
}
