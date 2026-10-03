import {
  detectTableDirection,
  resolveTableDirection,
  setTableTextDirection,
} from '@blocksuite/affine-block-table';
import {
  DefaultTheme,
  NoteBlockSchemaExtension,
  NoteDisplayMode,
  RootBlockSchemaExtension,
  type TableBlockModel,
  TableBlockSchemaExtension,
  TextDirection,
} from '@blocksuite/affine-model';
import {
  HtmlAdapter,
  MarkdownAdapter,
} from '@blocksuite/affine-shared/adapters';
import type { BlockSnapshot } from '@blocksuite/store';
import { Text } from '@blocksuite/store';
import {
  createAutoIncrementIdGenerator,
  TestWorkspace,
} from '@blocksuite/store/test';
import { describe, expect, test } from 'vitest';

import { createJob } from '../utils/create-job.js';
import { getProvider } from '../utils/get-provider.js';

const provider = getProvider();

const richText = (insert: string) => ({
  '$blocksuite:internal:text$': true,
  delta: insert ? [{ insert }] : [],
});

const tableSnapshot = (textDirection?: string): BlockSnapshot => ({
  type: 'block',
  id: 'block:note',
  flavour: 'affine:note',
  props: {
    xywh: '[0,0,800,95]',
    background: DefaultTheme.noteBackgrounColor,
    index: 'a0',
    hidden: false,
    displayMode: NoteDisplayMode.DocAndEdgeless,
  },
  children: [
    {
      type: 'block',
      id: 'block:table',
      flavour: 'affine:table',
      props: {
        rows: { r1: { rowId: 'r1', order: 'a0' } },
        columns: {
          c1: { columnId: 'c1', order: 'a0' },
          c2: { columnId: 'c2', order: 'a1' },
        },
        cells: {
          'r1:c1': { text: richText('الاسم') },
          'r1:c2': { text: richText('Name') },
        },
        ...(textDirection ? { textDirection } : {}),
      },
      children: [],
    },
  ],
});

describe('table text direction adapters', () => {
  test('html export emits dir on the table only when set', async () => {
    const adapter = new HtmlAdapter(createJob(), provider);
    const rtl = await adapter.fromBlockSnapshot({
      snapshot: tableSnapshot('rtl'),
    });
    expect(rtl.file).toMatch(/<table[^>]* dir="rtl"/);

    const plain = await adapter.fromBlockSnapshot({
      snapshot: tableSnapshot(),
    });
    expect(plain.file).toContain('<table');
    expect(plain.file).not.toContain('dir=');
  });

  test('html import reads dir from the table', async () => {
    const adapter = new HtmlAdapter(createJob(), provider);
    const snapshot = await adapter.toBlockSnapshot({
      file: '<table dir="RTL"><tbody><tr><td>أ</td><td>ب</td></tr></tbody></table>',
    });
    const table = snapshot.children.find(
      child => child.flavour === 'affine:table'
    );
    expect(table?.props.textDirection).toBe('rtl');

    const ltr = await adapter.toBlockSnapshot({
      file: '<table><tbody><tr><td>a</td></tr></tbody></table>',
    });
    const ltrTable = ltr.children.find(
      child => child.flavour === 'affine:table'
    );
    expect(ltrTable?.props.textDirection).toBeUndefined();
  });

  test('markdown ignores the direction', async () => {
    const adapter = new MarkdownAdapter(createJob(), provider);
    const rtl = await adapter.fromBlockSnapshot({
      snapshot: tableSnapshot('rtl'),
    });
    const plain = await adapter.fromBlockSnapshot({
      snapshot: tableSnapshot(),
    });
    expect(rtl.file).toBe(plain.file);
    expect(rtl.file).toContain('| الاسم | Name |');
  });
});

const extensions = [
  RootBlockSchemaExtension,
  NoteBlockSchemaExtension,
  TableBlockSchemaExtension,
];

function createTable(cellTexts: string[][]) {
  const collection = new TestWorkspace({
    id: 'test-collection',
    idGenerator: createAutoIncrementIdGenerator(),
  });
  collection.meta.initialize();
  const doc = collection.createDoc('doc0');
  doc.load();
  const store = doc.getStore({ extensions });
  const rootId = store.addBlock('affine:page');
  const noteId = store.addBlock('affine:note', {}, rootId);
  const rows: Record<string, { rowId: string; order: string }> = {};
  const columns: Record<string, { columnId: string; order: string }> = {};
  const cells: Record<string, { text: Text }> = {};
  cellTexts.forEach((row, rowIndex) => {
    const rowId = `r${rowIndex}`;
    rows[rowId] = { rowId, order: `a${rowIndex}` };
    row.forEach((text, columnIndex) => {
      const columnId = `c${columnIndex}`;
      columns[columnId] = { columnId, order: `a${columnIndex}` };
      cells[`${rowId}:${columnId}`] = { text: new Text(text) };
    });
  });
  const tableId = store.addBlock(
    'affine:table',
    { rows, columns, cells },
    noteId
  );
  const model = store.getBlock(tableId)!.model as TableBlockModel;
  return { collection, store, model };
}

describe('table text direction model', () => {
  test('set and reset are single undo steps', () => {
    const { store, model } = createTable([['a', 'b']]);
    store.resetHistory();
    expect(model.props.textDirection).toBeUndefined();

    setTableTextDirection(model, TextDirection.RTL);
    expect(model.props.textDirection).toBe('rtl');
    expect(model.props.textDirection$.value).toBe('rtl');
    expect(model.yBlock.get('prop:textDirection')).toBe('rtl');

    setTableTextDirection(model, null);
    expect(model.props.textDirection).toBeUndefined();
    expect(model.props.textDirection$.value).toBeUndefined();
    expect(model.yBlock.has('prop:textDirection')).toBe(false);

    store.undo();
    expect(model.props.textDirection).toBe('rtl');
    expect(model.props.textDirection$.value).toBe('rtl');
    store.undo();
    expect(model.props.textDirection).toBeUndefined();
    expect(store.canUndo).toBe(false);
  });

  test('snapshot round-trips the direction', async () => {
    const { store, model } = createTable([['a']]);
    setTableTextDirection(model, TextDirection.RTL);
    const snapshot = createJob().docToSnapshot(store);
    expect(snapshot).toBeDefined();
    const json = JSON.stringify(snapshot);
    expect(json).toContain('"textDirection":"rtl"');

    const imported = await createJob().snapshotToDoc(snapshot!);
    const table = imported?.getModelsByFlavour('affine:table')[0] as
      | TableBlockModel
      | undefined;
    expect(table?.props.textDirection).toBe('rtl');
  });

  test('auto resolves from the first cell with letters', () => {
    const arabic = createTable([
      ['', '١٢٣'],
      ['الخط', 'Kufic'],
    ]).model;
    expect(detectTableDirection(arabic)).toBe('rtl');
    expect(resolveTableDirection(arabic, 'auto')).toBe('rtl');
    expect(resolveTableDirection(arabic, 'none')).toBeUndefined();
    expect(resolveTableDirection(arabic, 'ltr')).toBe('ltr');

    const english = createTable([['Version', 'الإصدار']]).model;
    expect(resolveTableDirection(english, 'auto')).toBe('ltr');
    setTableTextDirection(english, TextDirection.RTL);
    expect(resolveTableDirection(english, 'auto')).toBe('rtl');

    const empty = createTable([['', '123']]).model;
    expect(resolveTableDirection(empty, 'auto')).toBeUndefined();
  });
});
