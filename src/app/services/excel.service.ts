import { Injectable } from '@angular/core';
import { StoredQuote } from './data-store.service';
import { Product } from '../models/product.model';

/**
 * Двусторонний Excel-обмен через SheetJS (xlsx).
 * Экспорт заявок и каталога, импорт прайс-листа.
 */
@Injectable({ providedIn: 'root' })
export class ExcelService {
  private async load() {
    const mod = await import('xlsx');
    return mod.default ?? mod;
  }

  // ─────────────────────────── ЭКСПОРТ ЗАЯВОК ───────────────────────

  async exportQuotes(quotes: StoredQuote[]): Promise<void> {
    const XLSX = await this.load();

    // Аркуш 1: сводка по заявкам
    const summaryData = [
      ['ID заявки', 'Дата', 'Клиент', 'Телефон', 'Город', 'Тип клиента', 'Позиций', 'Сумма (руб)', 'Статус', 'Заметка'],
      ...quotes.map((q) => {
        const sum = q.lines.reduce((s, l) => s + (l.product.priceRetail ?? 0) * l.qty, 0);
        return [
          q.id,
          new Date(q.createdAt).toLocaleDateString('ru-RU'),
          q.name || '',
          q.phone || '',
          q.city || '',
          this.clientTypeLabel(q.clientType),
          q.lines.length,
          sum > 0 ? sum : '',
          this.statusLabel(q.status),
          q.note || '',
        ];
      }),
    ];

    // Аркуш 2: все позиции с привязкой к заявке
    const linesData = [
      ['ID заявки', 'Артикул', 'Наименование', 'Категория', 'Диаметр', 'Ед.', 'Кол-во', 'Цена (руб)', 'Сумма (руб)'],
      ...quotes.flatMap((q) =>
        q.lines.map((l) => {
          const price = l.product.priceRetail ?? 0;
          return [
            q.id,
            l.product.sku,
            l.product.title,
            l.product.category,
            l.product.diameter,
            l.product.unit ?? 'шт',
            l.qty,
            price > 0 ? price : '',
            price > 0 ? price * l.qty : '',
          ];
        })
      ),
    ];

    const wb = XLSX.utils.book_new();

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    this.styleHeader(wsSummary, summaryData[0].length);
    this.autoWidth(wsSummary, summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Заявки');

    const wsLines = XLSX.utils.aoa_to_sheet(linesData);
    this.styleHeader(wsLines, linesData[0].length);
    this.autoWidth(wsLines, linesData);
    XLSX.utils.book_append_sheet(wb, wsLines, 'Позиции');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ФОБ-заявки-${date}.xlsx`);
  }

  // ─────────────────────────── ЭКСПОРТ КАТАЛОГА ─────────────────────

  async exportCatalog(products: Product[]): Promise<void> {
    const XLSX = await this.load();

    const rows = [
      ['SKU', 'SKU 1С', 'Наименование', 'Категория', 'Назначение', 'Диаметр', 'Ед.', 'Материал', 'Цена розн.', 'Цена опт.', 'Опт от (шт)', 'Наличие', 'Характеристики'],
      ...products.map((p) => [
        p.sku,
        p.sku1c ?? '',
        p.title,
        p.category,
        p.usage === 'internal' ? 'Внутренняя' : 'Наружная',
        p.diameter,
        p.unit ?? 'шт',
        p.material,
        p.priceRetail ?? '',
        p.priceWholesale ?? '',
        p.wholesaleFrom ?? '',
        p.availability === 'check' ? 'Уточнить' : 'Под заказ',
        p.spec,
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    this.styleHeader(ws, rows[0].length);
    this.autoWidth(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Каталог');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ФОБ-каталог-${date}.xlsx`);
  }

  // ─────────────────────────── ИМПОРТ КАТАЛОГА ──────────────────────

  async importCatalog(file: File): Promise<ImportResult> {
    const XLSX = await this.load();
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) {
      return { ok: false, error: 'Файл пустой или не содержит строк данных.' };
    }

    const header = (rows[0] as string[]).map((h) => String(h ?? '').trim().toLowerCase());
    const col = (name: string) => {
      const aliases: Record<string, string[]> = {
        sku:            ['sku', 'артикул', 'арт'],
        title:          ['наименование', 'название', 'товар'],
        priceRetail:    ['цена розн.', 'цена розн', 'розница', 'цена розничная', 'price'],
        priceWholesale: ['цена опт.', 'цена опт', 'оптовая', 'опт'],
        wholesaleFrom:  ['опт от (шт)', 'опт от', 'мин. партия'],
        unit:           ['ед.', 'ед', 'единица'],
        availability:   ['наличие'],
        sku1c:          ['sku 1с', 'sku1c', 'код 1с'],
        diameter:       ['диаметр', 'dn'],
        material:       ['материал'],
        category:       ['категория'],
        usage:          ['назначение'],
        spec:           ['характеристики', 'spec', 'описание'],
      };
      for (const alias of aliases[name] ?? [name]) {
        const idx = header.indexOf(alias);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const skuCol = col('sku');
    if (skuCol === -1) {
      return { ok: false, error: 'Не найдена колонка SKU / Артикул.' };
    }

    const updates: Partial<Product>[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i] as (string | number)[];
      const sku = String(row[skuCol] ?? '').trim();
      if (!sku) continue;

      const patch: Partial<Product> & { sku: string } = { sku };

      const titleIdx = col('title');
      if (titleIdx !== -1 && row[titleIdx]) patch.title = String(row[titleIdx]).trim();

      const pr = col('priceRetail');
      if (pr !== -1 && row[pr] !== '') {
        const v = parseFloat(String(row[pr]).replace(',', '.'));
        if (isNaN(v)) errors.push(`Строка ${i + 1}: цена розн. не число — "${row[pr]}"`);
        else patch.priceRetail = v;
      }

      const pw = col('priceWholesale');
      if (pw !== -1 && row[pw] !== '') {
        const v = parseFloat(String(row[pw]).replace(',', '.'));
        if (!isNaN(v)) patch.priceWholesale = v;
      }

      const wf = col('wholesaleFrom');
      if (wf !== -1 && row[wf] !== '') {
        const v = parseInt(String(row[wf]), 10);
        if (!isNaN(v)) patch.wholesaleFrom = v;
      }

      const unitIdx = col('unit');
      if (unitIdx !== -1 && row[unitIdx]) patch.unit = String(row[unitIdx]).trim() as any;

      const sku1cIdx = col('sku1c');
      if (sku1cIdx !== -1 && row[sku1cIdx]) patch.sku1c = String(row[sku1cIdx]).trim();

      const avIdx = col('availability');
      if (avIdx !== -1 && row[avIdx]) {
        patch.availability = String(row[avIdx]).toLowerCase().includes('заказ') ? 'order' : 'check';
      }

      updates.push(patch);
    }

    if (errors.length > 0 && updates.length === 0) {
      return { ok: false, error: errors.join('\n') };
    }

    return { ok: true, updates, warnings: errors };
  }

  // ─────────────────────────── ВСПОМОГАТЕЛЬНОЕ ──────────────────────

  private styleHeader(ws: any, cols: number): void {
    // SheetJS не поддерживает стили без платного XLS-X — пропускаем,
    // для CE версии достаточно правильной ширины колонок.
    void ws; void cols;
  }

  private autoWidth(ws: any, data: unknown[][]): void {
    if (!ws['!ref']) return;
    const colWidths: number[] = [];
    data.forEach((row) => {
      (row as unknown[]).forEach((cell, ci) => {
        const len = String(cell ?? '').length;
        colWidths[ci] = Math.min(Math.max(colWidths[ci] ?? 8, len + 2), 50);
      });
    });
    ws['!cols'] = colWidths.map((w) => ({ wch: w }));
  }

  private clientTypeLabel(t: string): string {
    return { private: 'Частное лицо', shop: 'Магазин', construction: 'Строительный объект', other: 'Другое' }[t] ?? t;
  }

  private statusLabel(s: string): string {
    return { new: 'Новая', in_progress: 'В работе', done: 'Закрыта' }[s] ?? s;
  }
}

export interface ImportResult {
  ok: boolean;
  updates?: Partial<Product>[];
  warnings?: string[];
  error?: string;
}
