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
  // Шрифт встроен в JS-бандл (pdf-fonts.ts, ~800 KB base64).
  // Загружается ленивым dynamic import — только при первой генерации PDF.
  // Никаких сетевых запросов, работает оффлайн и без CDN.
  private fontCacheR = '';
  private fontCacheB = '';

  private async loadFonts(): Promise<void> {
    if (this.fontCacheR) return;
    const fonts = await import('./pdf-fonts');
    this.fontCacheR = fonts.ROBOTO_R;
    this.fontCacheB = fonts.ROBOTO_B;
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

  // ─────────────────────────────────────────────────────────────────────
  //  ТОРГ-12 (товарная накладная)
  // ─────────────────────────────────────────────────────────────────────
  async torg12(q: StoredQuote, content: SiteContent): Promise<void> {
    await this.loadFonts();
    const doc = await this.makeDoc({});
    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 210, PAD = 12;
    const F = this.F;
    const dateStr = new Date(q.createdAt).toLocaleDateString('ru-RU');

    // Шапка
    doc.setFillColor(...GREEN); doc.rect(0, 0, W, 18, 'F');
    doc.setFont(F, 'bold'); doc.setFontSize(12); doc.setTextColor(255, 255, 255);
    doc.text('ТОВАРНАЯ НАКЛАДНАЯ  ТОРГ-12', PAD, 12);
    doc.setFont(F, 'normal'); doc.setFontSize(8);
    doc.text('№ ' + q.id + '  от ' + dateStr, W - PAD, 12, { align: 'right' });

    // Реквизиты — используем точно ту же схему что и в invoice (работает)
    let y = 26;
    const kv = (label: string, val: string) => {
      doc.setFont(F, 'bold'); doc.setFontSize(8.5); doc.setTextColor(...GRAY);
      doc.text(label, PAD, y);
      doc.setFont(F, 'normal'); doc.setTextColor(...DARK);
      doc.text(String(val || '—'), PAD + 40, y);   // NO splitTextToSize
      y += 6;
    };

    kv('Грузоотправитель:', content.companyLegal || 'ООО «Ф.О.Б»');
    const innKpp = [content.inn, content.kpp].filter(Boolean).join(' / ');
    kv('ИНН / КПП:', innKpp || '—');
    kv('Адрес:', content.address || '—');

    y += 2;
    doc.setDrawColor(...GRAY); doc.setLineWidth(0.2);
    doc.line(PAD, y, W - PAD, y); y += 4;

    kv('Грузополучатель:', q.name || '—');
    kv('Телефон:', q.phone || '—');
    if (q.city) kv('Адрес доставки:', q.city);
    kv('Основание:', 'Заявка № ' + q.id + ' от ' + dateStr);
    y += 2;

    // Таблица позиций (только 6 колонок — надёжно умещается)
    let total = 0; let totalVat = 0;
    const hasPrice = q.lines.some((l) => (l.product.priceRetail ?? 0) > 0);
    const body = q.lines.map((l, idx) => {
      const price = l.product.priceRetail ?? 0;
      const sum   = price * l.qty;
      const vat   = sum * 0.2;
      total    += sum;
      totalVat += vat;
      return [
        String(idx + 1),
        l.product.title,
        l.product.unit ?? 'шт',
        String(l.qty),
        hasPrice && price > 0 ? this.fmt(price) : '—',
        hasPrice && sum > 0   ? this.fmt(sum)   : '—',
        hasPrice && sum > 0   ? '20%'           : '—',
        hasPrice && vat > 0   ? this.fmt(vat)   : '—',
        hasPrice && sum > 0   ? this.fmt(sum + vat) : '—',
      ];
    });

    (doc as any).autoTable({
      head: [['№', 'Наименование', 'Ед.', 'Кол.', 'Цена', 'Сумма', 'НДС', 'Сумма НДС', 'Итого']],
      body, startY: y,
      margin: { left: PAD, right: PAD },
      styles: { font: F, fontSize: 8, cellPadding: 2.5, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], font: F, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: {
        0: { cellWidth: 8 },
        2: { cellWidth: 12 }, 3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' }, 5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 12, halign: 'center' }, 7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 24, halign: 'right' },
      },
    });

    const fy: number = (doc as any).lastAutoTable.finalY + 5;

    if (hasPrice) {
      const tRows = [
        ['Итого без НДС:', this.fmt(total) + ' руб.'],
        ['НДС 20%:', this.fmt(totalVat) + ' руб.'],
        ['Итого с НДС:', this.fmt(total + totalVat) + ' руб.'],
      ];
      tRows.forEach(([lbl, val], i) => {
        const isLast = i === 2;
        if (isLast) {
          doc.setFillColor(...GREEN);
          doc.rect(PAD, fy + i * 7 - 3, W - PAD * 2, 9, 'F');
          doc.setFont(F, 'bold'); doc.setTextColor(255, 255, 255);
        } else {
          doc.setFont(F, 'normal'); doc.setTextColor(...GRAY);
        }
        doc.setFontSize(9);
        doc.text(lbl, W - PAD - 50, fy + i * 7 + 2, { align: 'right' });
        doc.text(val, W - PAD, fy + i * 7 + 2, { align: 'right' });
      });
    }

    const sigY = Math.min(fy + (hasPrice ? 32 : 10), 265);
    doc.setFont(F, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
    doc.text('Грузоотправитель:', PAD, sigY);
    doc.setDrawColor(...GRAY); doc.setLineWidth(0.3);
    doc.line(PAD + 38, sigY, PAD + 98, sigY);
    doc.text('Грузополучатель:', PAD, sigY + 12);
    doc.line(PAD + 36, sigY + 12, PAD + 96, sigY + 12);

    this.footer(doc, content, F);
    this.savePdf(doc, 'ТОРГ12-' + q.id + '-' + dateStr.replace(/\./g, '-') + '.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────
  //  УПД (универсальный передаточный документ)
  // ─────────────────────────────────────────────────────────────────────
  async upd(q: StoredQuote, content: SiteContent): Promise<void> {
    await this.loadFonts();
    const doc = await this.makeDoc({});
    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 210, PAD = 12;
    const F = this.F;
    const dateStr = new Date(q.createdAt).toLocaleDateString('ru-RU');

    // Шапка
    doc.setFillColor(...GREEN); doc.rect(0, 0, W, 22, 'F');
    doc.setFont(F, 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255);
    doc.text('УНИВЕРСАЛЬНЫЙ ПЕРЕДАТОЧНЫЙ ДОКУМЕНТ (УПД)', PAD, 9);
    doc.setFont(F, 'normal'); doc.setFontSize(8);
    doc.text('Счёт-фактура + Передаточный документ', PAD, 15);
    doc.text('№ ' + q.id + '  от ' + dateStr, W - PAD, 15, { align: 'right' });

    // Реквизиты (та же схема что invoice — через block, без splitTextToSize)
    let y = 30;
    const block = (label: string, val: string) => {
      doc.setFont(F, 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY);
      doc.text(label, PAD, y);
      doc.setFont(F, 'normal'); doc.setTextColor(...DARK);
      doc.text(String(val || '—'), PAD + 34, y);
      y += 6;
    };
    const block2 = (l1: string, v1: string, l2: string, v2: string) => {
      doc.setFont(F, 'bold'); doc.setFontSize(8); doc.setTextColor(...GRAY);
      doc.text(l1, PAD, y);       doc.text(l2, PAD + 98, y);
      doc.setFont(F, 'normal'); doc.setTextColor(...DARK);
      doc.text(String(v1 || '—'), PAD + 34, y);
      doc.text(String(v2 || '—'), PAD + 132, y);
      y += 6;
    };

    block2('Продавец:', content.companyLegal || 'ООО «Ф.О.Б»', 'Покупатель:', q.name || '—');
    const innKpp = [content.inn, content.kpp].filter(Boolean).join('/');
    block2('ИНН/КПП:', innKpp || '—', 'Телефон:', q.phone || '—');
    block2('Адрес:', content.address || '—', 'Адрес:', q.city || '—');
    if (content.bankAccount) block('Р/С:', content.bankAccount);
    if (content.bankName)    block('Банк:', content.bankName + (content.bankBic ? '  БИК: ' + content.bankBic : ''));
    block('Основание:', 'Заявка № ' + q.id + ' от ' + dateStr);

    y += 2;
    doc.setDrawColor(...GRAY); doc.setLineWidth(0.2);
    doc.line(PAD, y, W - PAD, y); y += 4;

    // Таблица (7 колонок — надёжно умещается)
    let total = 0, vat20 = 0;
    const hasPrice = q.lines.some((l) => (l.product.priceRetail ?? 0) > 0);
    const body = q.lines.map((l, idx) => {
      const price  = l.product.priceRetail ?? 0;
      const sum    = price * l.qty;
      const vatAmt = sum * 0.2;
      total += sum;
      vat20 += vatAmt;
      return [
        String(idx + 1),
        l.product.title,
        l.product.unit ?? 'шт',
        String(l.qty),
        hasPrice && price > 0   ? this.fmt(price)         : '—',
        hasPrice && sum > 0     ? this.fmt(sum)            : '—',
        '20%',
        hasPrice && vatAmt > 0  ? this.fmt(vatAmt)         : '—',
        hasPrice && sum > 0     ? this.fmt(sum + vatAmt)   : '—',
      ];
    });

    (doc as any).autoTable({
      head: [['№', 'Наименование товара', 'Ед.', 'Кол.', 'Цена', 'Сумма без НДС', 'НДС%', 'Сумма НДС', 'Итого']],
      body, startY: y,
      margin: { left: PAD, right: PAD },
      styles: { font: F, fontSize: 8, cellPadding: 2.5, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], font: F, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: {
        0: { cellWidth: 8 },
        2: { cellWidth: 12 }, 3: { cellWidth: 12, halign: 'center' },
        4: { cellWidth: 22, halign: 'right' }, 5: { cellWidth: 24, halign: 'right' },
        6: { cellWidth: 12, halign: 'center' }, 7: { cellWidth: 22, halign: 'right' },
        8: { cellWidth: 24, halign: 'right' },
      },
    });

    const fy: number = (doc as any).lastAutoTable.finalY + 5;

    if (hasPrice) {
      // Итоги — прямые строки, без массива lines
      const r1 = 'Итого без НДС: ' + this.fmt(total) + ' руб.';
      const r2 = 'В т.ч. НДС (20%): ' + this.fmt(vat20) + ' руб.';
      const r3 = 'ИТОГО с НДС: ' + this.fmt(total + vat20) + ' руб.';
      doc.setFont(F, 'normal'); doc.setFontSize(9); doc.setTextColor(...GRAY);
      doc.text(r1, W - PAD, fy + 2,  { align: 'right' });
      doc.text(r2, W - PAD, fy + 9,  { align: 'right' });
      doc.setFillColor(...GREEN);
      doc.rect(PAD, fy + 13, W - PAD * 2, 9, 'F');
      doc.setFont(F, 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255);
      doc.text(r3, W - PAD, fy + 19, { align: 'right' });
    }

    // Подписи
    const sigY = Math.min(fy + (hasPrice ? 32 : 10), 260);
    doc.setFont(F, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
    doc.setDrawColor(...GRAY); doc.setLineWidth(0.3);

    doc.text('Руководитель:', PAD, sigY);
    doc.line(PAD + 30, sigY, PAD + 88, sigY);
    doc.text('Главный бухгалтер:', PAD + 98, sigY);
    doc.line(PAD + 130, sigY, PAD + 188, sigY);

    doc.text('Товар принял:', PAD, sigY + 12);
    doc.line(PAD + 28, sigY + 12, PAD + 86, sigY + 12);
    doc.text('Дата:', PAD + 98, sigY + 12);
    doc.line(PAD + 110, sigY + 12, PAD + 150, sigY + 12);

    this.footer(doc, content, F);
    this.savePdf(doc, 'УПД-' + q.id + '-' + dateStr.replace(/\./g, '-') + '.pdf');
  }

  // ─────────────────────────────────────────────────────────────────────
  //  Акт сверки взаиморасчётов
  // ─────────────────────────────────────────────────────────────────────
  async actSverki(
    quotes: StoredQuote[],
    clientName: string,
    clientPhone: string,
    content: SiteContent,
    period: string,
  ): Promise<void> {
    await this.loadFonts();
    const doc = await this.makeDoc({});
    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [110, 120, 115] as [number, number, number];
    const W = 210, PAD = 14;
    const F = this.F;

    // Шапка
    doc.setFillColor(...GREEN); doc.rect(0, 0, W, 24, 'F');
    doc.setFont(F, 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255);
    doc.text('АКТ СВЕРКИ ВЗАИМОРАСЧЁТОВ', PAD, 11);
    doc.setFont(F, 'normal'); doc.setFontSize(8.5);
    doc.text(`за период: ${period}`, PAD, 19);
    doc.text(new Date().toLocaleDateString('ru-RU'), W - PAD, 19, { align: 'right' });

    let y = 32;
    doc.setFont(F, 'bold'); doc.setFontSize(9); doc.setTextColor(...DARK);
    doc.text('Организация:', PAD, y);
    doc.text('Контрагент:', PAD + 100, y);
    y += 6;
    doc.setFont(F, 'normal');
    doc.text(content.companyLegal || 'ООО «Ф.О.Б»', PAD, y);
    doc.text(clientName || 'Покупатель', PAD + 100, y);
    y += 5;
    if (content.inn) { doc.setTextColor(...GRAY); doc.setFontSize(8); doc.text(`ИНН: ${content.inn}`, PAD, y); }
    if (clientPhone)  { doc.text(`Тел.: ${clientPhone}`, PAD + 100, y); }
    y += 10;

    doc.setDrawColor(...GRAY); doc.setLineWidth(0.3); doc.line(PAD, y - 3, W - PAD, y - 3);

    const sorted = [...quotes].sort((a, b) => a.createdAt - b.createdAt);
    let saldo = 0;
    let bodyRows: (string | object)[][] = [];

    // Начальное сальдо
    bodyRows.push([{ content: 'Сальдо на начало периода:', colSpan: 3, styles: { fontStyle: 'bold' } }, '0,00', '0,00', '0,00']);

    for (const q of sorted) {
      const sum = q.lines.reduce((s, l) => s + (l.product.priceRetail ?? 0) * l.qty, 0);
      const date = new Date(q.createdAt).toLocaleDateString('ru-RU');
      saldo += sum;
      bodyRows.push([
        date,
        `Заявка № ${q.id}`,
        q.comment || q.clientType || '',
        sum > 0 ? this.fmt(sum) : '—',
        '—',
        sum > 0 ? this.fmt(saldo) : '—',
      ]);
    }

    // Итоговая строка
    const totalDebit = sorted.reduce((s, q) => s + q.lines.reduce((ls, l) => ls + (l.product.priceRetail ?? 0) * l.qty, 0), 0);
    bodyRows.push([{ content: 'Обороты за период:', colSpan: 3, styles: { fontStyle: 'bold', fillColor: [245, 248, 246] } }, { content: this.fmt(totalDebit), styles: { fontStyle: 'bold', fillColor: [245, 248, 246] } }, { content: '0,00', styles: { fillColor: [245, 248, 246] } }, { content: this.fmt(saldo), styles: { fontStyle: 'bold', fillColor: [245, 248, 246] } }]);
    bodyRows.push([{ content: `Сальдо на конец периода: ${this.fmt(saldo)} руб. (задолженность покупателя)`, colSpan: 6, styles: { fontStyle: 'bold', fillColor: GREEN as [number, number, number], textColor: [255, 255, 255] } }]);

    (doc as any).autoTable({
      head: [['Дата', 'Документ', 'Примечание', 'Дебет (нам)', 'Кредит (от нас)', 'Сальдо']],
      body: bodyRows,
      startY: y + 2,
      margin: { left: PAD, right: PAD },
      styles: { font: F, fontSize: 8.5, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], font: F, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 251, 248] },
      columnStyles: { 0: { cellWidth: 20 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
    });

    const fy: number = (doc as any).lastAutoTable.finalY + 14;
    doc.setFont(F, 'normal'); doc.setFontSize(8.5); doc.setTextColor(...DARK);
    const sig2 = (l: string, x: number) => {
      doc.text(l, x, fy);
      doc.setDrawColor(...GRAY); doc.setLineWidth(0.3); doc.line(x + 26, fy, x + 76, fy);
    };
    sig2('От организации:', PAD);
    sig2('От контрагента:', PAD + 95);
    doc.setFont(F, 'normal'); doc.setFontSize(8); doc.setTextColor(...GRAY);
    doc.text('подпись, расшифровка', PAD + 26, fy + 5);
    doc.text('подпись, расшифровка', PAD + 95 + 26, fy + 5);

    this.footer(doc, content, F);
    const date = new Date().toISOString().slice(0, 10);
    this.savePdf(doc, `АктСверки-${clientName.replace(/\s+/g, '_')}-${date}.pdf`);
  }

  private fmt(n: number): string {
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}
