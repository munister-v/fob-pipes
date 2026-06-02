import { Injectable } from '@angular/core';
import { StoredQuote } from './data-store.service';
import { SiteContent } from './data-store.service';
import { CategoryDef, Product } from '../models/product.model';

/**
 * Генерация PDF-документов прямо в браузере через jsPDF.
 * Без серверного рендеринга — всё на стороне клиента.
 */
@Injectable({ providedIn: 'root' })
export class PdfService {
  private async load() {
    const [jspdfMod, autoTableMod] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const jsPDF = jspdfMod.default ?? (jspdfMod as any).jsPDF;
    // autoTable патчит прототип jsPDF при импорте
    void autoTableMod;
    return jsPDF;
  }

  /** Коммерческое предложение по заявке */
  async quoteKP(q: StoredQuote, content: SiteContent): Promise<void> {
    const jsPDF = await this.load();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [120, 130, 125] as [number, number, number];
    const W = 210;
    const PAD = 14;

    // ── Шапка ──────────────────────────────────────────────────────────
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 22, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('Ф.О.Б — Коммерческое предложение', PAD, 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`${content.address}  ·  ${content.phone}  ·  ${content.email}`, PAD, 17);

    // Номер + дата (правый угол)
    const dateStr = new Date(q.createdAt).toLocaleDateString('ru-RU');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`№ ${q.id}`, W - PAD, 10, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(dateStr, W - PAD, 16, { align: 'right' });

    // ── Блок контакта ──────────────────────────────────────────────────
    let y = 30;
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Кому:', PAD, y);
    doc.setFont('helvetica', 'normal');

    const clientTypeMap: Record<string, string> = {
      private: 'Частное лицо',
      shop: 'Магазин',
      construction: 'Строительный объект',
      other: 'Другое',
    };

    const infoLines = [
      q.name ? `Имя: ${q.name}` : null,
      q.phone ? `Телефон: ${q.phone}` : null,
      q.city ? `Город: ${q.city}` : null,
      `Тип: ${clientTypeMap[q.clientType] ?? q.clientType}`,
      q.comment ? `Примечание: ${q.comment}` : null,
    ].filter(Boolean) as string[];

    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    infoLines.forEach((line, i) => {
      doc.text(line, PAD + 16, y + i * 5);
    });

    y += infoLines.length * 5 + 8;

    // ── Таблица позиций ────────────────────────────────────────────────
    const hasPrice = q.lines.some((l) => (l.product.priceRetail ?? 0) > 0);

    const head = hasPrice
      ? [['№', 'Артикул', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Сумма']]
      : [['№', 'Артикул', 'Наименование', 'Ед.', 'Кол-во']];

    let total = 0;
    const body = q.lines.map((l, i) => {
      const price = l.product.priceRetail ?? 0;
      const sum   = price * l.qty;
      total += sum;
      const unit = l.product.unit ?? 'шт';
      const base = [
        String(i + 1),
        l.product.sku,
        l.product.title,
        unit,
        String(l.qty),
      ];
      if (hasPrice) {
        base.push(price > 0 ? this.fmt(price) : '—');
        base.push(sum > 0 ? this.fmt(sum) : '—');
      }
      return base;
    });

    (doc as any).autoTable({
      head,
      body,
      startY: y,
      margin: { left: PAD, right: PAD },
      styles: { fontSize: 9, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: hasPrice
        ? { 0: { cellWidth: 8 }, 1: { cellWidth: 22 }, 5: { halign: 'right' }, 6: { halign: 'right' } }
        : { 0: { cellWidth: 8 }, 1: { cellWidth: 26 } },
    });

    const finalY: number = (doc as any).lastAutoTable.finalY + 6;

    // ── Итог ──────────────────────────────────────────────────────────
    if (hasPrice && total > 0) {
      doc.setFillColor(245, 248, 246);
      doc.rect(PAD, finalY, W - PAD * 2, 18, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      doc.text(`Итого без НДС:`, W - PAD - 50, finalY + 6, { align: 'right' });
      doc.text(`НДС 20%:`, W - PAD - 50, finalY + 12, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...DARK);
      doc.text(this.fmt(total), W - PAD, finalY + 6, { align: 'right' });
      doc.text(this.fmt(total * 0.2), W - PAD, finalY + 12, { align: 'right' });

      doc.setFillColor(...GREEN);
      doc.rect(PAD, finalY + 18, W - PAD * 2, 10, 'F');
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text('К оплате:', W - PAD - 50, finalY + 25, { align: 'right' });
      doc.text(`${this.fmt(total * 1.2)} руб.`, W - PAD, finalY + 25, { align: 'right' });
    }

    // ── Подвал ────────────────────────────────────────────────────────
    const footY = 285;
    doc.setDrawColor(...GREEN);
    doc.setLineWidth(0.5);
    doc.line(PAD, footY, W - PAD, footY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text(
      `${content.address}  ·  ${content.phone}  ·  Viber: ${content.viber}  ·  ${content.email}  ·  ${content.hours}`,
      W / 2, footY + 5, { align: 'center' }
    );

    doc.save(`КП-${q.id}-${dateStr.replace(/\./g, '-')}.pdf`);
  }

  /** Счёт на оплату */
  async invoice(q: StoredQuote, content: SiteContent, invoiceNum: string): Promise<void> {
    const jsPDF = await this.load();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [120, 130, 125] as [number, number, number];
    const W = 210;
    const PAD = 14;

    // Шапка
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(`СЧЁТ НА ОПЛАТУ № ${invoiceNum}`, PAD, 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`от ${new Date(q.createdAt).toLocaleDateString('ru-RU')}`, PAD, 17);

    // Реквизиты
    let y = 30;
    const block = (label: string, val: string) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(label, PAD, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.text(val, PAD + 30, y);
      y += 6;
    };
    block('Поставщик:', content.companyLegal || 'ООО «Ф.О.Б»');
    if (content.companyCode) block('ИНН/ЕДРПОУ:', content.companyCode);
    block('Адрес:', content.address);
    block('Тел/факс:', content.phone);
    block('Email:', content.email);

    y += 4;
    doc.setDrawColor(...GRAY);
    doc.setLineWidth(0.3);
    doc.line(PAD, y, W - PAD, y);
    y += 6;

    block('Покупатель:', q.name || '—');
    block('Телефон:', q.phone || '—');
    block('Город:', q.city || '—');

    y += 6;

    const hasPrice = q.lines.some((l) => (l.product.priceRetail ?? 0) > 0);
    let total = 0;
    const body = q.lines.map((l, i) => {
      const price = l.product.priceRetail ?? 0;
      const sum   = price * l.qty;
      total += sum;
      return [
        String(i + 1),
        l.product.sku,
        l.product.title,
        l.product.unit ?? 'шт',
        String(l.qty),
        hasPrice && price > 0 ? this.fmt(price) : '—',
        hasPrice && sum > 0   ? this.fmt(sum)   : '—',
      ];
    });

    (doc as any).autoTable({
      head: [['№', 'Артикул', 'Наименование', 'Ед.', 'Кол-во', 'Цена', 'Сумма']],
      body,
      startY: y,
      margin: { left: PAD, right: PAD },
      styles: { fontSize: 8.5, cellPadding: 3, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: { 0: { cellWidth: 8 }, 5: { halign: 'right' }, 6: { halign: 'right' } },
    });

    const fy: number = (doc as any).lastAutoTable.finalY + 6;

    // Итог
    if (hasPrice) {
      const vat = total * 0.2;
      const rows = [
        ['Итого без НДС:', this.fmt(total)],
        ['НДС (20%):', this.fmt(vat)],
        ['ИТОГО К ОПЛАТЕ:', this.fmt(total + vat)],
      ];
      rows.forEach(([label, val], i) => {
        const isLast = i === rows.length - 1;
        if (isLast) {
          doc.setFillColor(...GREEN);
          doc.rect(PAD, fy + i * 8 - 4, W - PAD * 2, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(...GRAY);
          doc.setFont('helvetica', 'normal');
        }
        doc.setFontSize(9);
        doc.text(label, W - PAD - 50, fy + i * 8 + 2, { align: 'right' });
        doc.text(val + ' руб.', W - PAD, fy + i * 8 + 2, { align: 'right' });
      });
    }

    doc.save(`Счёт-${invoiceNum}-${q.id}.pdf`);
  }

  /** Недельный/ежедневный отчёт по заявкам */
  async reportQuotes(
    quotes: StoredQuote[],
    period: string,
    content: SiteContent
  ): Promise<void> {
    const jsPDF = await this.load();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const W = 297;
    const PAD = 14;

    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(`Ф.О.Б — Отчёт по заявкам · ${period}`, PAD, 13);

    const total = quotes.reduce((s, q) => s + q.lines.reduce((ls, l) => ls + (l.product.priceRetail ?? 0) * l.qty, 0), 0);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Всего: ${quotes.length} заявок · Сумма: ${this.fmt(total)} руб.`, W - PAD, 13, { align: 'right' });

    const statusLabel: Record<string, string> = { new: 'Новая', in_progress: 'В работе', done: 'Закрыта' };

    const body = quotes.map((q) => {
      const sum = q.lines.reduce((s, l) => s + (l.product.priceRetail ?? 0) * l.qty, 0);
      return [
        q.id,
        new Date(q.createdAt).toLocaleDateString('ru-RU'),
        q.name || '—',
        q.phone || '—',
        q.city || '—',
        String(q.lines.length),
        sum > 0 ? this.fmt(sum) : '—',
        statusLabel[q.status] ?? q.status,
        q.note || '',
      ];
    });

    (doc as any).autoTable({
      head: [['№ заявки', 'Дата', 'Клиент', 'Телефон', 'Город', 'Поз.', 'Сумма', 'Статус', 'Заметка']],
      body,
      startY: 26,
      margin: { left: PAD, right: PAD },
      styles: { fontSize: 8, cellPadding: 2.5, textColor: DARK },
      headStyles: { fillColor: GREEN, textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 248, 246] },
      columnStyles: { 6: { halign: 'right' } },
    });

    doc.save(`Отчёт-заявки-${period}.pdf`);
  }

  /** Полный прайс-лист в PDF: товары сгруппированы по категориям */
  async priceList(products: Product[], categories: CategoryDef[], content: SiteContent): Promise<void> {
    const jsPDF = await this.load();
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const GREEN = [40, 184, 77] as [number, number, number];
    const DARK  = [13, 16, 15]  as [number, number, number];
    const GRAY  = [120, 130, 125] as [number, number, number];
    const W = 210, PAD = 14;
    const dateStr = new Date().toLocaleDateString('ru-RU');

    // Шапка
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, W, 26, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('ПРАЙС-ЛИСТ', PAD, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(content.companyLegal || 'ООО «Ф.О.Б»', PAD, 17);
    doc.setFontSize(8);
    doc.text(`${content.address}  ·  ${content.phone}  ·  ${content.email}`, PAD, 22);

    doc.setFontSize(9);
    doc.text(`от ${dateStr}`, W - PAD, 11, { align: 'right' });
    doc.setFontSize(7.5);
    doc.text('Цены в руб. без НДС', W - PAD, 17, { align: 'right' });
    doc.text('Цены и наличие уточняйте у менеджера', W - PAD, 22, { align: 'right' });

    let cursorY = 34;

    // Группируем товары по категориям, в порядке categories
    for (const cat of categories) {
      const inCat = products.filter((p) => p.category === cat.id);
      if (inCat.length === 0) continue;

      // Заголовок категории
      if (cursorY > 260) { doc.addPage(); cursorY = 18; }
      doc.setFillColor(245, 248, 246);
      doc.rect(PAD, cursorY, W - PAD * 2, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...DARK);
      doc.text(`${cat.index}.  ${cat.title}`, PAD + 4, cursorY + 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(`${inCat.length} позиций`, W - PAD - 4, cursorY + 7, { align: 'right' });

      cursorY += 12;

      const body = inCat
        .sort((a, b) => a.diameter - b.diameter || a.sku.localeCompare(b.sku))
        .map((p) => [
          p.sku,
          p.title,
          `Ø${p.diameter}`,
          p.material,
          p.usage === 'external' ? 'Наруж.' : 'Внутр.',
          p.unit || 'шт',
          (p.priceRetail ?? 0) > 0 ? this.fmt(p.priceRetail!) : '—',
          (p.priceWholesale ?? 0) > 0 ? this.fmt(p.priceWholesale!) : '—',
        ]);

      (doc as any).autoTable({
        head: [['Артикул', 'Наименование', 'Ø', 'Материал', 'Назн.', 'Ед.', 'Розн.', 'Опт']],
        body,
        startY: cursorY,
        margin: { left: PAD, right: PAD },
        styles: { fontSize: 8, cellPadding: 2.4, textColor: DARK },
        headStyles: { fillColor: GREEN, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 249] },
        columnStyles: {
          0: { cellWidth: 24, font: 'courier', fontSize: 7.5 },
          2: { cellWidth: 13, halign: 'center' },
          4: { cellWidth: 16 },
          5: { cellWidth: 12 },
          6: { cellWidth: 18, halign: 'right', fontStyle: 'bold' },
          7: { cellWidth: 18, halign: 'right' },
        },
      });

      cursorY = (doc as any).lastAutoTable.finalY + 6;
    }

    // Подвал на последней странице
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(...GREEN);
      doc.setLineWidth(0.4);
      doc.line(PAD, 288, W - PAD, 288);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(
        `${content.companyLegal || 'ООО «Ф.О.Б»'}  ·  ${content.phone}  ·  ${content.email}  ·  ${content.address}`,
        PAD, 293,
      );
      doc.text(`Стр. ${i} из ${pageCount}`, W - PAD, 293, { align: 'right' });
    }

    doc.save(`Прайс-ФОБ-${dateStr.replace(/\./g, '-')}.pdf`);
  }

  private fmt(n: number): string {
    return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
}
