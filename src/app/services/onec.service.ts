import { Injectable } from '@angular/core';
import { CategoryDef, Product } from '../models/product.model';
import { SiteContent } from './data-store.service';

/**
 * Выгрузка каталога в формате CommerceML 2.08 для 1С (Предприятие 8 / Сайт).
 *
 * Стандартный обмен 1С состоит из двух файлов:
 *  • import.xml  — классификатор (группы) + каталог (товары, характеристики);
 *  • offers.xml  — пакет предложений (цены по типам + остатки на складе).
 *
 * Файлы кодируются в UTF-8 (поддерживается CommerceML ≥ 2.05); идентификаторы
 * классификатора и каталога фиксированы, поэтому повторные выгрузки совместимы.
 */
@Injectable({ providedIn: 'root' })
export class OneCService {
  /** Стабильные GUID классификатора и каталога (не меняются между выгрузками). */
  private readonly CLASSIFIER_ID = 'f0b00000-0000-4000-8000-000000000001';
  private readonly CATALOG_ID    = 'f0b00000-0000-4000-8000-000000000002';
  private readonly OFFERS_ID     = 'f0b00000-0000-4000-8000-000000000003';

  /** Единицы измерения → коды ОКЕИ. */
  private readonly OKEI: Record<string, { code: string; name: string }> = {
    'шт':     { code: '796', name: 'Штука' },
    'м.п.':   { code: '006', name: 'Метр' },
    'кг':     { code: '166', name: 'Килограмм' },
    'компл.': { code: '839', name: 'Комплект' },
  };

  /** Сформировать и скачать оба файла обмена. */
  exportAll(products: Product[], categories: CategoryDef[], content: SiteContent): void {
    this.download('import.xml', this.buildImport(products, categories, content));
    // небольшая задержка, чтобы браузер не схлопнул две загрузки в одну
    setTimeout(() => this.download('offers.xml', this.buildOffers(products, content)), 250);
  }

  // ─────────────────────────── import.xml ───────────────────────────
  buildImport(products: Product[], categories: CategoryDef[], content: SiteContent): string {
    const date = this.now();
    const org = this.esc(content.companyLegal || 'ООО «Ф.О.Б»');

    const groups = categories
      .map(
        (c) =>
          `      <Группа>\n` +
          `        <Ид>${this.esc(c.id)}</Ид>\n` +
          `        <Наименование>${this.esc(c.title)}</Наименование>\n` +
          `      </Группа>`
      )
      .join('\n');

    const goods = products.map((p) => this.productNode(p)).join('\n');

    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<КоммерческаяИнформация ВерсияСхемы="2.08" ДатаФормирования="${date}">\n` +
      `  <Классификатор>\n` +
      `    <Ид>${this.CLASSIFIER_ID}</Ид>\n` +
      `    <Наименование>Классификатор (${org})</Наименование>\n` +
      `    <Владелец>\n` +
      `      <Ид>${this.CLASSIFIER_ID}</Ид>\n` +
      `      <Наименование>${org}</Наименование>\n` +
      `    </Владелец>\n` +
      `    <Группы>\n${groups}\n    </Группы>\n` +
      `  </Классификатор>\n` +
      `  <Каталог СодержитТолькоИзменения="false">\n` +
      `    <Ид>${this.CATALOG_ID}</Ид>\n` +
      `    <ИдКлассификатора>${this.CLASSIFIER_ID}</ИдКлассификатора>\n` +
      `    <Наименование>Каталог товаров (${org})</Наименование>\n` +
      `    <Товары>\n${goods}\n    </Товары>\n` +
      `  </Каталог>\n` +
      `</КоммерческаяИнформация>\n`
    );
  }

  private productNode(p: Product): string {
    const id = this.productId(p);
    const unit = this.OKEI[p.unit ?? 'шт'] ?? this.OKEI['шт'];
    const props: string[] = [];
    if (p.diameter) props.push(this.propValue('diameter', 'Диаметр, мм', String(p.diameter)));
    if (p.material) props.push(this.propValue('material', 'Материал', p.material));
    props.push(this.propValue('usage', 'Назначение', p.usage === 'external' ? 'Наружная' : 'Внутренняя'));

    return (
      `      <Товар>\n` +
      `        <Ид>${this.esc(id)}</Ид>\n` +
      `        <Артикул>${this.esc(p.sku)}</Артикул>\n` +
      `        <Наименование>${this.esc(p.title)}</Наименование>\n` +
      `        <Группы>\n          <Ид>${this.esc(p.category)}</Ид>\n        </Группы>\n` +
      `        <БазоваяЕдиница Код="${unit.code}" НаименованиеПолное="${unit.name}">${this.esc(p.unit ?? 'шт')}</БазоваяЕдиница>\n` +
      (p.spec ? `        <Описание>${this.esc(p.spec)}</Описание>\n` : '') +
      `        <ЗначенияСвойств>\n${props.join('\n')}\n        </ЗначенияСвойств>\n` +
      `      </Товар>`
    );
  }

  private propValue(id: string, name: string, value: string): string {
    return (
      `          <ЗначенияСвойства>\n` +
      `            <Ид>${this.esc(id)}</Ид>\n` +
      `            <Наименование>${this.esc(name)}</Наименование>\n` +
      `            <Значение>${this.esc(value)}</Значение>\n` +
      `          </ЗначенияСвойства>`
    );
  }

  // ─────────────────────────── offers.xml ───────────────────────────
  buildOffers(products: Product[], content: SiteContent): string {
    const date = this.now();
    const org = this.esc(content.companyLegal || 'ООО «Ф.О.Б»');

    const offers = products
      .map((p) => {
        const id = this.productId(p);
        const prices: string[] = [];
        if ((p.priceRetail ?? 0) > 0) {
          prices.push(this.priceNode('retail', 'Розничная', p.priceRetail!, p.unit ?? 'шт'));
        }
        if ((p.priceWholesale ?? 0) > 0) {
          prices.push(this.priceNode('wholesale', 'Оптовая', p.priceWholesale!, p.unit ?? 'шт'));
        }
        const qty = Math.max(0, p.stock ?? 0);
        return (
          `      <Предложение>\n` +
          `        <Ид>${this.esc(id)}</Ид>\n` +
          `        <Артикул>${this.esc(p.sku)}</Артикул>\n` +
          `        <Наименование>${this.esc(p.title)}</Наименование>\n` +
          (prices.length ? `        <Цены>\n${prices.join('\n')}\n        </Цены>\n` : '') +
          `        <Количество>${qty}</Количество>\n` +
          `      </Предложение>`
        );
      })
      .join('\n');

    return (
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<КоммерческаяИнформация ВерсияСхемы="2.08" ДатаФормирования="${date}">\n` +
      `  <ПакетПредложений>\n` +
      `    <Ид>${this.OFFERS_ID}</Ид>\n` +
      `    <Наименование>Пакет предложений (${org})</Наименование>\n` +
      `    <ИдКаталога>${this.CATALOG_ID}</ИдКаталога>\n` +
      `    <ИдКлассификатора>${this.CLASSIFIER_ID}</ИдКлассификатора>\n` +
      `    <ТипыЦен>\n` +
      `      <ТипЦены>\n        <Ид>retail</Ид>\n        <Наименование>Розничная</Наименование>\n        <Валюта>RUB</Валюта>\n      </ТипЦены>\n` +
      `      <ТипЦены>\n        <Ид>wholesale</Ид>\n        <Наименование>Оптовая</Наименование>\n        <Валюта>RUB</Валюта>\n      </ТипЦены>\n` +
      `    </ТипЦены>\n` +
      `    <Предложения>\n${offers}\n    </Предложения>\n` +
      `  </ПакетПредложений>\n` +
      `</КоммерческаяИнформация>\n`
    );
  }

  private priceNode(typeId: string, _name: string, value: number, unit: string): string {
    return (
      `          <Цена>\n` +
      `            <ИдТипаЦены>${typeId}</ИдТипаЦены>\n` +
      `            <ЦенаЗаЕдиницу>${value}</ЦенаЗаЕдиницу>\n` +
      `            <Валюта>RUB</Валюта>\n` +
      `            <Единица>${this.esc(unit)}</Единица>\n` +
      `          </Цена>`
    );
  }

  // ─────────────────────────── helpers ──────────────────────────────
  /** Ид товара: реальный 1С-ключ, если задан, иначе детерминированный GUID из артикула. */
  private productId(p: Product): string {
    if (p.sku1c && p.sku1c.trim()) return p.sku1c.trim();
    return this.guidFromString(p.sku);
  }

  /** Детерминированный GUID-подобный идентификатор из строки (для повторяемости выгрузки). */
  private guidFromString(s: string): string {
    let h = 0x811c9dc5;
    const bytes: number[] = [];
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    // разворачиваем хэш в 16 байт детерминированно
    let x = h >>> 0;
    for (let i = 0; i < 16; i++) {
      x = (Math.imul(x, 1664525) + 1013904223) >>> 0;
      bytes.push(x & 0xff);
    }
    const hex = bytes.map((b) => b.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-4${hex[6].slice(1)}${hex[7]}-8${hex[8].slice(1)}${hex[9]}-${hex.slice(10, 16).join('')}`;
  }

  private esc(v: string): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private now(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  private download(name: string, xml: string): void {
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
