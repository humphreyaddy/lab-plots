import type { ColumnSpec, ColumnType } from '../types';

const TYPES: ColumnType[] = ['categorical', 'numeric', 'binary', 'text'];

const TYPE_BADGE: Record<ColumnType, string> = {
  categorical: 'bg-violet-100 text-violet-800',
  numeric: 'bg-emerald-100 text-emerald-800',
  binary: 'bg-amber-100 text-amber-800',
  text: 'bg-sky-100 text-sky-800',
};

type Props = {
  specs: ColumnSpec[];
  selected: Set<string>;
  onToggle: (col: string) => void;
  onOverride: (col: string, t?: ColumnType) => void;
};

export function ColumnProfile({ specs, selected, onToggle, onOverride }: Props) {
  if (specs.length === 0) {
    return (
      <p className="text-sm text-ink-500">
        Pick the ID column above first — then this table populates with every other column,
        its detected datatype, a sample, and a checkbox to add it to your tree.
      </p>
    );
  }
  return (
    <div className="overflow-auto rounded-md border border-ink-200">
      <table className="w-full text-sm">
        <thead className="bg-ink-100 text-ink-600">
          <tr>
            <th className="w-12 px-3 py-2 text-left">Use</th>
            <th className="px-3 py-2 text-left">Column</th>
            <th className="px-3 py-2 text-left">Datatype</th>
            <th className="px-3 py-2 text-left">Unique</th>
            <th className="px-3 py-2 text-left">Null</th>
            <th className="px-3 py-2 text-left">Sample</th>
          </tr>
        </thead>
        <tbody>
          {specs.map((spec) => (
            <tr key={spec.name} className="border-t border-ink-100 hover:bg-ink-50">
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-ink-300"
                  checked={selected.has(spec.name)}
                  onChange={() => onToggle(spec.name)}
                  aria-label={`Use ${spec.name} for an annotation`}
                />
              </td>
              <td className="px-3 py-2 font-medium text-ink-800">{spec.name}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`pill ${TYPE_BADGE[spec.effectiveType]}`}>
                    {spec.effectiveType}
                  </span>
                  <select
                    className="select w-32 text-xs"
                    value={spec.overriddenType ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      onOverride(spec.name, v === '' ? undefined : (v as ColumnType));
                    }}
                    aria-label={`Override datatype for ${spec.name}`}
                  >
                    <option value="">auto</option>
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </td>
              <td className="px-3 py-2 text-ink-600">{spec.uniqueCount}</td>
              <td className="px-3 py-2 text-ink-600">{spec.nullCount}</td>
              <td className="px-3 py-2 text-ink-600 max-w-xs truncate">
                {spec.sample.join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
