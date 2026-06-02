import { Injectable } from '@angular/core';
import { StoredQuote } from './data-store.service';
import { SiteContent } from './data-store.service';
import { CategoryDef, Product } from '../models/product.model';

/**
 * PDF-генерация в браузере через jsPDF + jspdf-autotable.
 * Поддержка кириллицы через Roboto TTF (загружается с CDN один раз, кешируется).
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  // ── Roboto TTF для кириллицы (кеш) ────────────────────────────────────
  private fontCacheR = '';   // Roboto Regular base64
  private fontCacheB = '';   // Roboto Bold   base64

  /**
   * Загружает TTF из собственных assets (src/assets/fonts/).
   * URL строится относительно document.baseURI чтобы работать при любом base-href.
   * Кеш — на время сессии, повторные PDF генерируются мгновенно.
   */
  private async fetchFont(filename: string): Promise<string> {
    // document.baseURI = 'https://munister.com.ua/fob/' при base-href=/fob/
    const url = new URL(`assets/fonts/${filename}`, document.baseURI).href;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Font ${filename} load failed: ${r.status} (${url})`);
    const buf = await r.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let b = '';
    // ArrayBuffer → base64 чанками (избегаем stack overflow на большом файле)
    const CHUNK = 8192;
    for (let i = 0; i < bytes.length; i += CHUNK) {
      b += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(b);
  }

  /** Загружает Roboto Regular + Bold параллельно (только если ещё не загружены). */
  private async loadFonts(): Promise<void> {
    if (this.fontCacheR) return;
    const [r, b] = await Promise.all([
      this.fetchFont('Roboto-Regular.ttf'),
      this.fetchFont('Roboto-Bold.ttf'),
    ]);
    this.fontCacheR = r;
    this.fontCacheB = b;
  }

  /** Создаёт jsPDF и регистрирует в нём Roboto. */
  private async makeDoc(opts: { orientation?: 'portrait' | 'landscape'; format?: string }) {
    // jspdf-autotable должен патчить прототип после загрузки jsPDF → sequential
    const jspdfMod = await import('jspdf');
    const jsPDF: any = (jspdfMod as any).jsPDF ?? jspdfMod.default;
    await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: opts.orientation ?? 'portrait',
      unit: 'mm',
      format: opts.format ?? 'a4',
      putOnlyUsedFonts: true,
    });

    // Регистрируем Roboto если шрифт доступен (может не загрузиться офлайн)
    if (this.fontCacheR) {
      doc.addFileToVFS('Roboto-Regular.ttf', this.fontCacheR);
      doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    }
    if (this.fontCacheB) {
      doc.addFileToVFS('Roboto-Bold.ttf', this.fontCacheB);
      doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');
    }
    return doc;
  }

  /** Шрифт для setFont */
  private get F() { return this.fontCacheR ? 'Roboto' : 'helvetica'; }

  /** Сохранение через Blob — надёжнее doc.save() в Safari / Chrome */
  private savePdf(doc: any, filename: string): void {
    const blob = doc.output('blob') as Blob;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Коммерческое предложение
  // ─────────────────────────────────────────────────────────────────────
  async quoteKP(q: StoredQuote, content: SiteContent): Promise<void> {
    await this.loadFonts();
    const doc = await this.makeDoc({});

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 210, PAD = 14;
    const dateStr = new Date(q.createdAt).toLocaleDateString('ru-RU');
    const F = this.F;

    // Шапка
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 24, 'F');
    doc.setFont(F, 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('Ф.О.Б — Коммерческое предложение', PAD, 11);
    doc.setFont(F, 'normal');
    doc.setFontSize(7.5);
    doc.text(`${content.address}  ·  ${content.phone}  ·  ${content.email}`, PAD, 19);
    doc.setFont(F, 'bold');
    doc.setFontSize(9);
    doc.text(`№ ${q.id}`, W - PAD, 11, { align: 'right' });
    doc.setFont(F, 'normal');
    doc.setFontSize(8);
    doc.text(dateStr, W - PAD, 18, { align: 'right' });

    // Клиент
    let y = 32;
    const clientTypeMap: Record<string, string> = {
      private: 'Частное лицо', shop: 'Магазин',
      construction: 'Строительный объект', other: 'Другое',
    };
    doc.setFont(F, 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text('Кому:', PAD, y);
    doc.setFont(F, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const infoLines = [
      q.name   ? `Имя: ${q.name}` : null,
      q.phone  ? `Телефон: ${q.phone}` : null,
      q.city   ? `Город: ${q.city}` : null,
      `Тип: ${clientTypeMap[q.clientType] ?? q.clientType}`,
      q.comment ? `Примечание: ${q.comment}` : null,
    ].filter(Boolean) as string[];
    infoLines.forEach((line, i) => doc.text(line, PAD + 16, y + (i + 1) * 5.5));
    y += infoLines.length * 5.5 + 12;

    // Таблица
    const hasPrice = q.lines.some((l) => (l.product.priceRetail ?? 0) > 0);
    let total = 0;
    const body = q.lines.map((l, i) => {
      const price = l.product.priceRetail ?? 0;
      const sum = price * l.qty;
      total += sum;
      const row = [String(i + 1), l.product.sku, l.product.title, l.product.unit ?? 'шт', String(l.qty)];
      if (hasPrice) { row.push(price > 0 ? this.fmt(price) : '—'); row.push(sum > 0 ? this.fmt(sum) : '—'); }
      return row;
    });

    const head = hasPrice
      ? [['№', 'Артикул', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Сумма']]
      : [['№', 'Артикул', 'Наименование', 'Ед.', 'Кол-во']];

    (doc as any).autoTable({
      head, body, startY: y,
      margin: { left: PAD, right: PAD },
      styles: { font: F, fontSize: 9, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold', font: F },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: hasPrice
        ? { 0: { cellWidth: 8 }, 1: { cellWidth: 22, font: 'courier' }, 5: { halign: 'right' }, 6: { halign: 'right' } }
        : { 0: { cellWidth: 8 }, 1: { cellWidth: 26, font: 'courier' } },
    });

    const fy: number = (doc as any).lastAutoTable.finalY + 6;

    if (hasPrice && total > 0) {
      doc.setFillColor(245, 248, 246);
      doc.rect(PAD, fy, W - PAD * 2, 14, 'F');
      doc.setFont(F, 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
      doc.text('Итого:', W - PAD - 50, fy + 5, { align: 'right' });
      doc.text('НДС 20%:', W - PAD - 50, fy + 10, { align: 'right' });
      doc.setFont(F, 'bold'); doc.setTextColor(...DARK);
      doc.text(this.fmt(total) + ' руб.', W - PAD, fy + 5, { align: 'right' });
      doc.text(this.fmt(total * 0.2) + ' руб.', W - PAD, fy + 10, { align: 'right' });
      doc.setFillColor(...GREEN);
      doc.rect(PAD, fy + 14, W - PAD * 2, 10, 'F');
      doc.setFontSize(10); doc.setTextColor(255, 255, 255);
      doc.text('К оплате:', W - PAD - 50, fy + 21, { align: 'right' });
      doc.text(this.fmt(total * 1.2) + ' руб.', W - PAD, fy + 21, { align: 'right' });
    }

    this.footer(doc, content, F);
    this.savePdf(doc, `КП-${q.id}-${dateStr.replace(/\./g, '-')}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Счёт на оплату
  // ─────────────────────────────────────────────────────────────────────
  async invoice(q: StoredQuote, content: SiteContent, invoiceNum: string): Promise<void> {
    await this.loadFonts();
    const doc = await this.makeDoc({});

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 210, PAD = 14;
    const F = this.F;

    // Шапка
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 24, 'F');
    doc.setFont(F, 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
    doc.text(`СЧЁТ НА ОПЛАТУ № ${invoiceNum}`, PAD, 11);
    doc.setFont(F, 'normal'); doc.setFontSize(8);
    doc.text(`от ${new Date(q.createdAt).toLocaleDateString('ru-RU')}`, PAD, 19);

    // Реквизиты
    let y = 32;
    const row = (label: string, val: string) => {
      doc.setFont(F, 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY);
      doc.text(label, PAD, y);
      doc.setFont(F, 'normal'); doc.setTextColor(...DARK);
      doc.text(val, PAD + 34, y);
      y += 6.5;
    };
    row('Поставщик:', content.companyLegal || 'ООО «Ф.О.Б»');
    if (content.inn)         row('ИНН:', content.inn + (content.kpp ? `  КПП: ${content.kpp}` : ''));
    if (content.companyCode) row('ОГРН/ЕДРПОУ:', content.companyCode);
    row('Адрес:', content.address);
    row('Тел.:', content.phone);
    if (content.bankName)    row('Банк:', content.bankName);
    if (content.bankBic)     row('БИК:', content.bankBic);
    if (content.bankAccount) row('Р/С:', content.bankAccount);
    if (content.bankCorr)    row('К/С:', content.bankCorr);

    doc.setDrawColor(...GRAY); doc.setLineWidth(0.2); doc.line(PAD, y, W - PAD, y); y += 5;

    row('Покупатель:', q.name || '—');
    row('Телефон:', q.phone || '—');
    if (q.city) row('Город:', q.city);
    y += 2;

    let total = 0;
    const body = q.lines.map((l, i) => {
      const price = l.product.priceRetail ?? 0;
      const sum = price * l.qty;
      total += sum;
      return [String(i + 1), l.product.sku, l.product.title, l.product.unit ?? 'шт', String(l.qty),
              price > 0 ? this.fmt(price) : '—', sum > 0 ? this.fmt(sum) : '—'];
    });

    (doc as any).autoTable({
      head: [['№', 'Артикул', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Сумма']],
      body, startY: y,
      margin: { left: PAD, right: PAD },
      styles: { font: F, fontSize: 8.5, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], font: F, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 24, font: 'courier' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
    });

    const fy: number = (doc as any).lastAutoTable.finalY + 6;
    const vat = total * 0.2;
    const rows2 = [['Итого без НДС:', this.fmt(total)], ['НДС (20%):', this.fmt(vat)], ['ИТОГО К ОПЛАТЕ:', this.fmt(total + vat)]];
    rows2.forEach(([label, val], i) => {
      const isLast = i === rows2.length - 1;
      if (isLast) { doc.setFillColor(...GREEN); doc.rect(PAD, fy + i * 8 - 4, W - PAD * 2, 10, 'F'); doc.setTextColor(255, 255, 255); doc.setFont(F, 'bold'); }
      else { doc.setTextColor(...GRAY); doc.setFont(F, 'normal'); }
      doc.setFontSize(9);
      doc.text(label, W - PAD - 50, fy + i * 8 + 2, { align: 'right' });
      doc.text(val + ' руб.', W - PAD, fy + i * 8 + 2, { align: 'right' });
    });

    this.footer(doc, content, F);
    this.savePdf(doc, `Счёт-${invoiceNum}-${q.id}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Отчёт по заявкам
  // ─────────────────────────────────────────────────────────────────────
  async reportQuotes(quotes: StoredQuote[], period: string, content: SiteContent): Promise<void> {
    await this.loadFonts();
    const doc = await this.makeDoc({ orientation: 'landscape' });

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 297, PAD = 14;
    const F = this.F;

    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 20, 'F');
    doc.setFont(F, 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text(`Ф.О.Б — Отчёт по заявкам · ${period}`, PAD, 13);
    const total = quotes.reduce((s, q) => s + q.lines.reduce((ls, l) => ls + (l.product.priceRetail ?? 0) * l.qty, 0), 0);
    doc.setFont(F, 'normal'); doc.setFontSize(8);
    doc.text(`Всего: ${quotes.length} заявок · ${this.fmt(total)} руб.`, W - PAD, 13, { align: 'right' });

    const statusLabel: Record<string, string> = { new: 'Новая', in_progress: 'В работе', done: 'Закрыта' };
    const body = quotes.map((q) => {
      const sum = q.lines.reduce((s, l) => s + (l.product.priceRetail ?? 0) * l.qty, 0);
      return [q.id, new Date(q.createdAt).toLocaleDateString('ru-RU'), q.name || '—', q.phone || '—', q.city || '—',
              String(q.lines.length), sum > 0 ? this.fmt(sum) : '—', statusLabel[q.status] ?? q.status, q.note || ''];
    });

    (doc as any).autoTable({
      head: [['№ заявки', 'Дата', 'Клиент', 'Телефон', 'Город', 'Поз.', 'Сумма', 'Статус', 'Заметка']],
      body, startY: 26,
      margin: { left: PAD, right: PAD },
      styles: { font: F, fontSize: 8, cellPadding: 2.5, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], font: F, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: { 6: { halign: 'right' } },
    });

    doc.setFont(F, 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
    const pg = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pg; i++) {
      doc.setPage(i);
      doc.setDrawColor(...GREEN); doc.setLineWidth(0.3); doc.line(PAD, 198, W - PAD, 198);
      doc.text(`${content.companyLegal || 'ООО «Ф.О.Б»'}  ·  ${content.phone}`, PAD, 203);
      doc.text(`Стр. ${i} из ${pg}`, W - PAD, 203, { align: 'right' });
    }

    this.savePdf(doc, `Отчёт-заявки-${period}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Прайс-лист
  // ─────────────────────────────────────────────────────────────────────
  async priceList(products: Product[], categories: CategoryDef[], content: SiteContent): Promise<void> {
    await this.loadFonts();
    const doc = await this.makeDoc({});

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 210, PAD = 14;
    const F = this.F;
    const dateStr = new Date().toLocaleDateString('ru-RU');

    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 26, 'F');
    doc.setFont(F, 'bold'); doc.setFontSize(15); doc.setTextColor(255, 255, 255);
    doc.text('ПРАЙС-ЛИСТ', PAD, 11);
    doc.setFont(F, 'normal'); doc.setFontSize(9);
    doc.text(content.companyLegal || 'ООО «Ф.О.Б»', PAD, 17);
    doc.setFontSize(7.5);
    doc.text(`${content.address}  ·  ${content.phone}  ·  ${content.email}`, PAD, 22);
    doc.setFontSize(9); doc.text(`от ${dateStr}`, W - PAD, 11, { align: 'right' });
    doc.setFontSize(7.5); doc.text('Цены в руб. без НДС', W - PAD, 17, { align: 'right' });
    doc.text('Уточняйте у менеджера', W - PAD, 22, { align: 'right' });

    let cur = 34;
    for (const cat of categories) {
      const inCat = products.filter((p) => p.category === cat.id);
      if (!inCat.length) continue;
      if (cur > 262) { doc.addPage(); cur = 18; }
      doc.setFillColor(245, 248, 246);
      doc.rect(PAD, cur, W - PAD * 2, 10, 'F');
      doc.setFont(F, 'bold'); doc.setFontSize(11); doc.setTextColor(...DARK);
      doc.text(`${cat.index}.  ${cat.title}`, PAD + 4, cur + 7);
      doc.setFont(F, 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
      doc.text(`${inCat.length} поз.`, W - PAD - 4, cur + 7, { align: 'right' });
      cur += 12;

      const body = inCat
        .sort((a, b) => a.diameter - b.diameter || a.sku.localeCompare(b.sku))
        .map((p) => [
          p.sku, p.title, `Ø${p.diameter}`, p.material,
          p.usage === 'external' ? 'Наруж.' : 'Внутр.', p.unit || 'шт',
          (p.priceRetail ?? 0) > 0 ? this.fmt(p.priceRetail!) : '—',
          (p.priceWholesale ?? 0) > 0 ? this.fmt(p.priceWholesale!) : '—',
        ]);

      (doc as any).autoTable({
        head: [['Артикул', 'Наименование', 'Ø', 'Материал', 'Назн.', 'Ед.', 'Розн.', 'Опт']],
        body, startY: cur,
        margin: { left: PAD, right: PAD },
        styles: { font: F, fontSize: 8, cellPadding: 2.4, textColor: DARK },
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255], font: F, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 249] },
        columnStyles: {
          0: { cellWidth: 24, font: 'courier', fontSize: 7.5 },
          2: { cellWidth: 13, halign: 'center' },
          4: { cellWidth: 16 }, 5: { cellWidth: 12 },
          6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 18, halign: 'right' },
        },
      });
      cur = (doc as any).lastAutoTable.finalY + 6;
    }

    const pg = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pg; i++) {
      doc.setPage(i);
      doc.setDrawColor(...GREEN); doc.setLineWidth(0.4); doc.line(PAD, 288, W - PAD, 288);
      doc.setFont(F, 'normal'); doc.setFontSize(7); doc.setTextColor(...GRAY);
      doc.text(`${content.companyLegal || 'ООО «Ф.О.Б»'}  ·  ${content.phone}  ·  ${content.email}`, PAD, 293);
      doc.text(`Стр. ${i} из ${pg}`, W - PAD, 293, { align: 'right' });
    }

    this.savePdf(doc, `Прайс-ФОБ-${dateStr.replace(/\./g, '-')}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Спецификация конфигуратора
  // ─────────────────────────────────────────────────────────────────────
  async spec(
    sysTitle: string,
    bom:    { label: string; product: { title: string } | null; qty: number; sum: number; note?: string }[],
    checks: { label: string; value: string; status: string }[],
    content: SiteContent,
  ): Promise<void> {
    await this.loadFonts();
    const doc = await this.makeDoc({});

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 210, PAD = 14;
    const F = this.F;

    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 24, 'F');
    doc.setFont(F, 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text(`Ф.О.Б — Спецификация: ${sysTitle}`, PAD, 10);
    doc.setFont(F, 'normal'); doc.setFontSize(7.5);
    doc.text(`${content.address}  ·  ${content.phone}  ·  ${content.email}`, PAD, 18);
    doc.text(new Date().toLocaleDateString('ru-RU'), W - PAD, 18, { align: 'right' });

    let y = 32;
    doc.setFont(F, 'bold'); doc.setFontSize(10); doc.setTextColor(...DARK);
    doc.text('Нормативные показатели', PAD, y); y += 6;
    doc.setFont(F, 'normal'); doc.setFontSize(9);
    for (const c of checks) {
      doc.setTextColor(...GRAY); doc.text(c.label + ':', PAD, y);
      doc.setTextColor(...DARK); doc.text(c.value, PAD + 72, y); y += 6;
    }
    y += 4;

    doc.setFont(F, 'bold'); doc.setFontSize(10); doc.setTextColor(...DARK);
    doc.text('Спецификация материалов', PAD, y); y += 5;

    const total = bom.reduce((s, l) => s + l.sum, 0);
    const hasPrices = bom.some((l) => l.sum > 0);

    (doc as any).autoTable({
      startY: y, margin: { left: PAD, right: PAD },
      head: [['Позиция', 'Артикул / наименование', 'Кол-во', ...(hasPrices ? ['Сумма, руб.'] : [])]],
      body: bom.map((l) => [
        l.label + (l.note ? `\n${l.note}` : ''),
        l.product?.title ?? 'подберёт менеджер',
        String(l.qty),
        ...(hasPrices ? [l.sum > 0 ? this.fmt(l.sum) : '—'] : []),
      ]),
      foot: hasPrices ? [[
        { content: 'ИТОГО (ориентировочно, по розничным ценам):', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
        { content: this.fmt(total), styles: { fontStyle: 'bold' } },
      ]] : [],
      styles: { font: F, fontSize: 9, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], font: F, fontStyle: 'bold' },
      footStyles: { fillColor: [235, 248, 235], textColor: DARK, font: F },
      alternateRowStyles: { fillColor: [248, 251, 248] },
      columnStyles: { 0: { cellWidth: 58 }, 2: { halign: 'center', cellWidth: 18 }, 3: { halign: 'right', cellWidth: 24 } },
    });

    doc.setDrawColor(...GREEN); doc.setLineWidth(0.4);
    doc.line(PAD, 282, W - PAD, 282);
    doc.setFont(F, 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
    doc.text('Ориентировочная спецификация. Наличие, цены и комплектацию уточняйте у менеджера.',
      W / 2, 287, { align: 'center' });
    doc.text(`${content.address}  ·  ${content.phone}  ·  ${content.hours}`, W / 2, 292, { align: 'center' });

    const date = new Date().toISOString().slice(0, 10);
    this.savePdf(doc, `ФОБ-спецификация-${sysTitle.replace(/\s+/g, '-')}-${date}.pdf`);
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Helpers
  // ─────────────────────────────────────────────────────────────────────
  private footer(doc: any, content: SiteContent, F: string): void {
    const GREEN = [40, 184, 77] as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 210, PAD = 14;
    doc.setDrawColor(...GREEN); doc.setLineWidth(0.4); doc.line(PAD, 282, W - PAD, 282);
    doc.setFont(F, 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRAY);
    doc.text(`${content.address}  ·  ${content.phone}  ·  ${content.email}  ·  ${content.hours}`,
      W / 2, 288, { align: 'center' });
  }

  private fmt(n: number): string {
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}
