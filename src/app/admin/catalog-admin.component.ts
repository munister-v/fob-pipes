import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore } from '../services/data-store.service';
import { Availability, PriceUnit, Product, ProductCategory, Usage } from '../models/product.model';
import { ToastService } from './toast.service';
import { ExcelService, ImportResult } from '../services/excel.service';

type SortKey = 'sku' | 'title' | 'diameter' | 'category' | 'priceRetail';

@Component({
  selector: 'app-catalog-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Каталог</h1>
        <p class="adm-sub">{{ filtered().length }} из {{ store.products().length }} · изменения сразу на сайте</p>
      </div>
      <div class="adm-head__actions">
        <input class="adm-search" type="text" placeholder="Поиск…"
               [ngModel]="search()" (ngModelChange)="search.set($event)" />
        <button class="adm-btn" (click)="exportExcel()" title="Скачать Excel-прайс">↓ Excel</button>
        <button class="adm-btn" (click)="exportCsv()">↓ CSV</button>
        <label class="adm-btn" title="Импорт из Excel (.xlsx) или JSON/CSV">
          ↑ Импорт
          <input type="file" accept=".xlsx,.json,.csv" hidden (change)="importFile($event)" />
        </label>
        <button class="adm-btn adm-btn--accent" (click)="create()">+ Товар</button>
      </div>
    </header>

    <!-- Превью импорта Excel -->
    <div class="adm-import-preview adm-card" *ngIf="importPreview() as prev">
      <div class="adm-card__head">
        <h2>Превью импорта — {{ prev.updates!.length }} записей</h2>
        <div>
          <button class="adm-btn adm-btn--accent" (click)="applyImport()">Применить</button>
          <button class="adm-btn" (click)="importPreview.set(null)">Отмена</button>
        </div>
      </div>
      <p class="adm-warn" *ngFor="let w of prev.warnings">⚠ {{ w }}</p>
      <table class="adm-table adm-table--mini">
        <tr><th>Артикул</th><th>Цена розн.</th><th>Цена опт.</th><th>Ед.</th><th>SKU 1C</th></tr>
        <tr *ngFor="let u of prev.updates!.slice(0, 20)">
          <td class="adm-mono">{{ u.sku }}</td>
          <td class="adm-mono">{{ u.priceRetail ?? '—' }}</td>
          <td class="adm-mono">{{ u.priceWholesale ?? '—' }}</td>
          <td>{{ u.unit ?? '—' }}</td>
          <td class="adm-mono">{{ u.sku1c ?? '—' }}</td>
        </tr>
        <tr *ngIf="prev.updates!.length > 20">
          <td colspan="5" class="adm-empty">…и ещё {{ prev.updates!.length - 20 }}</td>
        </tr>
      </table>
    </div>

    <div class="adm-toolbar">
      <div class="adm-tabs adm-tabs--wrap">
        <button [class.is-active]="fCat() === 'all'" (click)="fCat.set('all')">Все категории</button>
        <button *ngFor="let c of store.categories()" [class.is-active]="fCat() === c.id" (click)="fCat.set(c.id)">{{ c.title }}</button>
      </div>
      <div class="adm-tabs">
        <button [class.is-active]="fUsage() === 'all'" (click)="fUsage.set('all')">Любое</button>
        <button [class.is-active]="fUsage() === 'internal'" (click)="fUsage.set('internal')">Внутр.</button>
        <button [class.is-active]="fUsage() === 'external'" (click)="fUsage.set('external')">Наруж.</button>
      </div>
    </div>

    <div class="adm-card adm-card--flush">
      <table class="adm-table adm-table--sortable">
        <thead>
          <tr>
            <th (click)="setSort('sku')">Артикул <i>{{ arrow('sku') }}</i></th>
            <th (click)="setSort('title')">Название <i>{{ arrow('title') }}</i></th>
            <th (click)="setSort('category')">Категория <i>{{ arrow('category') }}</i></th>
            <th (click)="setSort('diameter')">Ø <i>{{ arrow('diameter') }}</i></th>
            <th (click)="setSort('priceRetail')">Цена розн. <i>{{ arrow('priceRetail') }}</i></th>
            <th>Назначение</th><th>Наличие</th><th></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let p of filtered()">
            <td class="adm-mono">{{ p.sku }}</td>
            <td>{{ p.title }}</td>
            <td>{{ catTitle(p.category) }}</td>
            <td class="adm-mono">{{ p.diameter }}</td>
            <td class="adm-mono">
              <ng-container *ngIf="(p.priceRetail ?? 0) > 0; else noPrice">
                {{ p.priceRetail | number:'1.0-0':'ru' }} р.
                <span class="adm-sub" *ngIf="(p.priceWholesale ?? 0) > 0">
                  / {{ p.priceWholesale | number:'1.0-0':'ru' }} (опт)
                </span>
              </ng-container>
              <ng-template #noPrice><span class="adm-sub">—</span></ng-template>
            </td>
            <td>{{ p.usage === 'external' ? 'Наружная' : 'Внутренняя' }}</td>
            <td>
              <span class="adm-pill" [class.adm-pill--done]="p.availability === 'check'"
                    [class.adm-pill--prog]="p.availability === 'order'">
                {{ p.availability === 'order' ? 'Под заказ' : 'В наличии' }}
              </span>
            </td>
            <td class="adm-table__act">
              <button class="adm-icon" (click)="edit(p)" title="Изменить">✎</button>
              <button class="adm-icon" (click)="duplicate(p)" title="Дублировать">⧉</button>
              <button class="adm-icon adm-icon--del" (click)="remove(p)" title="Удалить">✕</button>
            </td>
          </tr>
          <tr *ngIf="filtered().length === 0">
            <td colspan="8" class="adm-empty">Ничего не найдено.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Editor modal -->
    <div class="adm-modal" *ngIf="draft() as d" (click)="cancel()">
      <form class="adm-modal__card" (click)="$event.stopPropagation()" (ngSubmit)="save()">
        <h2 class="adm-modal__title">{{ isNew() ? 'Новый товар' : 'Изменить товар' }}</h2>

        <div class="adm-grid2">
          <label class="adm-field">
            <span>Артикул *</span>
            <input [(ngModel)]="d.sku" name="sku" [readonly]="!isNew()" required placeholder="PVC-EX-110" />
          </label>
          <label class="adm-field">
            <span>Диаметр, мм *</span>
            <input type="number" [(ngModel)]="d.diameter" name="diameter" required min="1" />
          </label>
        </div>

        <label class="adm-field">
          <span>Название *</span>
          <input [(ngModel)]="d.title" name="title" required placeholder="Труба канализационная Ø110" />
        </label>

        <label class="adm-field">
          <span>Описание</span>
          <input [(ngModel)]="d.spec" name="spec" placeholder="Наружная · ПВХ · раструбная" />
        </label>

        <div class="adm-grid2">
          <label class="adm-field">
            <span>Категория</span>
            <select [(ngModel)]="d.category" name="category">
              <option *ngFor="let c of store.categories()" [value]="c.id">{{ c.title }}</option>
            </select>
          </label>
          <label class="adm-field">
            <span>Материал</span>
            <input [(ngModel)]="d.material" name="material" placeholder="ПВХ" />
          </label>
        </div>

        <div class="adm-grid2">
          <label class="adm-field">
            <span>Назначение</span>
            <select [(ngModel)]="d.usage" name="usage">
              <option value="internal">Внутренняя</option>
              <option value="external">Наружная</option>
            </select>
          </label>
          <label class="adm-field">
            <span>Наличие</span>
            <select [(ngModel)]="d.availability" name="availability">
              <option value="check">В наличии (уточнить)</option>
              <option value="order">Под заказ</option>
            </select>
          </label>
        </div>

        <!-- Цены -->
        <h3 class="adm-modal__section">Цены</h3>
        <div class="adm-grid2">
          <label class="adm-field">
            <span>Цена розничная (руб.)</span>
            <input type="number" [(ngModel)]="d.priceRetail" name="priceRetail" min="0" placeholder="0" />
          </label>
          <label class="adm-field">
            <span>Цена оптовая (руб.)</span>
            <input type="number" [(ngModel)]="d.priceWholesale" name="priceWholesale" min="0" placeholder="0" />
          </label>
        </div>
        <div class="adm-grid2">
          <label class="adm-field">
            <span>Единица измерения</span>
            <select [(ngModel)]="d.unit" name="unit">
              <option value="шт">шт</option>
              <option value="м.п.">м.п.</option>
              <option value="кг">кг</option>
              <option value="компл.">компл.</option>
            </select>
          </label>
          <label class="adm-field">
            <span>Опт от (шт)</span>
            <input type="number" [(ngModel)]="d.wholesaleFrom" name="wholesaleFrom" min="1" placeholder="10" />
          </label>
        </div>
        <label class="adm-field">
          <span>SKU в 1С (необязательно)</span>
          <input [(ngModel)]="d.sku1c" name="sku1c" placeholder="000001234" class="adm-mono" />
        </label>

        <p class="adm-modal__err" *ngIf="dupErr()">Товар с таким артикулом уже существует.</p>

        <div class="adm-modal__foot">
          <button type="button" class="adm-btn" (click)="cancel()">Отмена</button>
          <button type="submit" class="adm-btn adm-btn--accent">Сохранить</button>
        </div>
      </form>
    </div>
  `,
})
export class CatalogAdminComponent {
  readonly store = inject(DataStore);
  private readonly toast = inject(ToastService);
  private readonly excel = inject(ExcelService);

  readonly search = signal('');
  readonly fCat = signal<'all' | ProductCategory>('all');
  readonly fUsage = signal<'all' | Usage>('all');
  readonly sortKey = signal<SortKey>('sku');
  readonly sortDir = signal<1 | -1>(1);

  readonly draft = signal<Product | null>(null);
  readonly isNew = signal(false);
  readonly dupErr = signal(false);
  readonly importPreview = signal<ImportResult | null>(null);

  readonly filtered = computed(() => {
    const q = this.search().trim().toLowerCase();
    const cat = this.fCat();
    const use = this.fUsage();
    const key = this.sortKey();
    const dir = this.sortDir();
    let list = this.store.products().filter(
      (p) =>
        (cat === 'all' || p.category === cat) &&
        (use === 'all' || p.usage === use) &&
        (!q || p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.spec.toLowerCase().includes(q))
    );
    list = [...list].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[key] ?? 0;
      const bv = (b as unknown as Record<string, unknown>)[key] ?? 0;
      return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * dir;
    });
    return list;
  });

  catTitle(id: ProductCategory): string {
    return this.store.categories().find((c) => c.id === id)?.title ?? id;
  }

  setSort(k: SortKey): void {
    if (this.sortKey() === k) this.sortDir.update((d) => (d === 1 ? -1 : 1));
    else { this.sortKey.set(k); this.sortDir.set(1); }
  }
  arrow(k: SortKey): string {
    return this.sortKey() === k ? (this.sortDir() === 1 ? '↑' : '↓') : '';
  }

  create(): void {
    this.isNew.set(true);
    this.dupErr.set(false);
    this.draft.set({
      sku: '', title: '', category: 'pipe' as ProductCategory, usage: 'internal' as Usage,
      diameter: 110, spec: '', availability: 'check' as Availability, material: 'ПВХ', unit: 'шт',
    });
  }

  edit(p: Product): void {
    this.isNew.set(false);
    this.dupErr.set(false);
    this.draft.set({ ...p });
  }

  duplicate(p: Product): void {
    let sku = p.sku + '-COPY';
    let n = 2;
    while (this.store.products().some((x) => x.sku === sku)) sku = `${p.sku}-COPY${n++}`;
    this.store.upsertProduct({ ...p, sku, title: p.title + ' (копия)' });
    this.toast.ok('Товар дублирован');
  }

  cancel(): void {
    this.draft.set(null);
  }

  save(): void {
    const d = this.draft();
    if (!d || !d.sku.trim() || !d.title.trim()) return;
    if (this.isNew() && this.store.products().some((p) => p.sku === d.sku)) {
      this.dupErr.set(true);
      return;
    }
    this.store.upsertProduct({ ...d, diameter: +d.diameter });
    this.draft.set(null);
    this.toast.ok(this.isNew() ? 'Товар добавлен' : 'Сохранено');
  }

  remove(p: Product): void {
    if (confirm(`Удалить «${p.title}» (${p.sku})?`)) {
      this.store.deleteProduct(p.sku);
      this.toast.ok('Товар удалён');
    }
  }

  // ── Excel ──────────────────────────────────────────────────────────

  async exportExcel(): Promise<void> {
    await this.excel.exportCatalog(this.store.products());
    this.toast.ok('Excel-прайс скачан');
  }

  async importFile(ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    input.value = '';

    if (file.name.endsWith('.xlsx')) {
      const result = await this.excel.importCatalog(file);
      if (!result.ok) {
        this.toast.err(result.error ?? 'Ошибка импорта');
        return;
      }
      this.importPreview.set(result);
      return;
    }

    // JSON / CSV (старый путь)
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const items: Product[] = file.name.endsWith('.csv') ? this.parseCsv(text) : JSON.parse(text);
        let n = 0;
        for (const p of items) {
          if (p?.sku && p?.title) { this.store.upsertProduct({ ...p, diameter: +p.diameter }); n++; }
        }
        this.toast.ok(`Импортировано: ${n}`);
      } catch {
        this.toast.err('Не удалось прочитать файл');
      }
    };
    reader.readAsText(file);
  }

  applyImport(): void {
    const prev = this.importPreview();
    if (!prev?.updates) return;
    let applied = 0;
    for (const patch of prev.updates) {
      const existing = this.store.products().find((p) => p.sku === patch.sku);
      if (existing) {
        this.store.upsertProduct({ ...existing, ...patch });
        applied++;
      }
    }
    this.importPreview.set(null);
    this.toast.ok(`Обновлено ${applied} из ${prev.updates.length} товаров`);
  }

  // ── CSV (старый) ───────────────────────────────────────────────────

  exportCsv(): void {
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const head = ['sku', 'title', 'category', 'usage', 'diameter', 'material', 'spec', 'availability', 'priceRetail', 'priceWholesale', 'unit'];
    const rows = [head, ...this.filtered().map((p) => head.map((k) => String((p as unknown as Record<string, unknown>)[k] ?? '')))];
    const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fob-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.ok('CSV скачан');
  }

  private parseCsv(text: string): Product[] {
    const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return [];
    const head = lines[0].split(/[;,]/).map((h) => h.trim().replace(/^"|"$/g, ''));
    return lines.slice(1).map((line) => {
      const cells = line.match(/("([^"]|"")*"|[^;,]*)/g)?.filter((_, i) => i % 2 === 0) ?? [];
      const obj: Record<string, string> = {};
      head.forEach((h, i) => (obj[h] = (cells[i] ?? '').replace(/^"|"$/g, '').replace(/""/g, '"')));
      return {
        sku: obj['sku'], title: obj['title'],
        category: (obj['category'] || 'pipe') as ProductCategory,
        usage: (obj['usage'] || 'internal') as Usage,
        diameter: +obj['diameter'] || 0,
        material: obj['material'] || '', spec: obj['spec'] || '',
        availability: (obj['availability'] || 'check') as Availability,
        priceRetail: obj['priceRetail'] ? +obj['priceRetail'] : undefined,
        priceWholesale: obj['priceWholesale'] ? +obj['priceWholesale'] : undefined,
        unit: (obj['unit'] as PriceUnit) || 'шт',
      } as Product;
    });
  }
}
