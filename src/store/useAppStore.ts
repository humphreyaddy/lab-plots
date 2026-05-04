import { create } from 'zustand';
import type { ColumnSpec, ColumnType, PlotKind, Table } from '../types';
import { applyOverride, profileTable } from '../core/infer';
import { guessIdColumn } from '../core/idColumn';

type State = {
  /** Which tool the user is currently in. null = landing page. */
  plot: PlotKind | null;

  table: Table | null;
  fileName: string | null;
  sheets: Table[];
  activeSheet: number;

  idColumn: string | null;
  columnSpecs: ColumnSpec[];

  treeText: string | null;
  treeFileName: string | null;

  setPlot: (kind: PlotKind | null) => void;
  setTables: (sheets: Table[], fileName: string) => void;
  setActiveSheet: (i: number) => void;
  setIdColumn: (col: string | null) => void;
  overrideType: (col: string, t?: ColumnType) => void;
  setTree: (text: string | null, fileName?: string | null) => void;
  reset: () => void;
};

const initial = {
  plot: null,
  table: null,
  fileName: null,
  sheets: [],
  activeSheet: 0,
  idColumn: null,
  columnSpecs: [] as ColumnSpec[],
  treeText: null,
  treeFileName: null,
};

export const useAppStore = create<State>((set, get) => ({
  ...initial,

  setPlot: (kind) => set({ plot: kind }),

  setTables: (sheets, fileName) => {
    const active = sheets[0] ?? null;
    const guessed = active ? guessIdColumn(active) : null;
    set({
      sheets,
      activeSheet: 0,
      table: active,
      fileName,
      idColumn: guessed,
      columnSpecs: active ? profileTable(active, guessed) : [],
    });
  },

  setActiveSheet: (i) => {
    const t = get().sheets[i];
    if (!t) return;
    const guessed = guessIdColumn(t);
    set({
      activeSheet: i,
      table: t,
      idColumn: guessed,
      columnSpecs: profileTable(t, guessed),
    });
  },

  setIdColumn: (col) => {
    const { table } = get();
    if (!table) return;
    set({ idColumn: col, columnSpecs: profileTable(table, col) });
  },

  overrideType: (col, t) =>
    set((s) => ({
      columnSpecs: s.columnSpecs.map((c) =>
        c.name === col ? applyOverride(c, t) : c,
      ),
    })),

  setTree: (text, fileName) =>
    set({ treeText: text, treeFileName: fileName ?? null }),

  reset: () => set(initial),
}));
