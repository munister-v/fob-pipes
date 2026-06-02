import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore } from '../services/data-store.service';
import { Product, ProductCategory } from '../models/product.model';
import { ToastService } from './toast.service';

interface StockRow {
  product: Product;
  stock: number;
  reserved: number;
  available: number;
}

type StockFilter = 'all' | 'low' | 'out' | 'reserved';

/** Складской учёт: физический остаток, авто-резерв из активных заявок, доступный остаток. */
@Component({
  selector: 'app-warehouse-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Склад</h1>
        <p class="adm-sub">
          Остаток · резерв из активных заявок · доступно.
          Резерв снимается автоматически при закрытии заявки.
        </p>
      </div>
      <div class="adm-head__actions">
        <input class="adm-search" type="text" placeholder="Артикул, название…"
               [ngModel]="search()" (ngModelChange)="search.set($event)" />
        <button class="adm-btn" (click)="exportCsv()" [disabled]="rows().length === 0">↓ CSV</button>
      </div>
    </header>

    <!-- KPI -->
    <div class="adm-stats adm-stats--sm">
      <div class="adm-stat adm-stat--sm">
        <span class="adm-stat__num">{{ totalStock() | number:'1.0-0':'ru' }}</span>
        <span class="adm-stat__lbl">единиц на складе</span>
      </div>
      <div class="adm-stat adm-stat--sm">
        <span class="adm-stat__num adm-stock--warn">{{ totalReserved() | number:'1.0-0':'ru' }}</span>
        <span class="adm-stat__lbl">в резерве</span>
      </div>
      <div class="adm-stat adm-stat--sm">
        <span class="adm-stat__num" [class.adm-stock--danger]="totalAvailable() < 0">{{ totalAvailable() | number:'1.0-0':'ru' }}</span>
        <span class="adm-stat__lbl">доступно к продаже</span>
      </div>
      <div class="adm-stat adm-stat--sm">
        <span class="adm-stat__num adm-stock--danger">{{ outCount() }}</span>
        <span class="adm-stat__lbl">нет в наличии</span>
      </div>
    </div>

    <div class="adm-toolbar">
      <div class="adm-tabs">
        <button [class.is-active]="filter() === 'all'" (click)="filter.set('all')">Все</button>
        <button [class.is-active]="filter() === 'low'" (click)="filter.set('low')">Заканчивается</button>
        <button [class.is-active]="filter() === 'out'" (click)="filter.set('out')">Нет в наличии</button>
        <button [class.is-active]="filter() === 'reserved'" (click)="filter.set('reserved')">В резерве</button>
      </div>
      <label class="adm-field adm-field--inline">
        <span>Порог «заканчивается»</span>
        <input type="number" min="0" class="adm-mono" style="width:80px"
               [ngModel]="lowThreshold()" (ngModelChange)="lowThreshold.set(+$event || 0)" />
      </label>
    </div>

    <div class="adm-card adm-card--flush">
      <table class="adm-table">
        <thead>
          <tr>
            <th>Артикул</th><th>Название</th><th>Категория</th>
            <th style="text-align:right">Остаток</th>
            <th style="text-align:right">Резерв</th>
            <th style="text-align:right">Доступно</th>
            <th>Статус</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let r of rows()" [class.is-selected]="r.available < 0">
            <td class="adm-mono">{{ r.product.sku }}</td>
            <td>{{ r.product.title }}</td>
            <td>{{ catTitle(r.product.category) }}</td>
            <td style="text-align:right">
              <input class="adm-stock-input adm-mono" type="number" min="0"
                     [ngModel]="r.stock" (ngModelChange)="setStock(r.product.sku, $event)" />
            </td>
            <td class="adm-mono" style="text-align:right" [class.adm-stock--warn]="r.reserved > 0">
              {{ r.reserved || '—' }}
            </td>
            <td class="adm-mono" style="text-align:right"
                [class.adm-stock--danger]="r.available <= 0"
                [class.adm-stock--ok]="r.available > 0">
              {{ r.available }}
            </td>
            <td>
              <span class="adm-pill" [ngClass]="statusClass(r)">{{ statusLabel(r) }}</span>
            </td>
          </tr>
          <tr *ngIf="rows().length === 0">
            <td colspan="7" class="adm-empty">Ничего не найдено.</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
})
export class WarehouseAdminComponent {
  readonly store = inject(DataStore);
  private readonly toast = inject(ToastService);

  readonly search = signal('');
  readonly filter = signal<StockFilter>('all');
  readonly lowThreshold = signal(10);

  readonly allRows = computed<StockRow[]>(() => {
    const reservations = this.store.reservations();
    return this.store.products().map((product) => {
      const stock = product.stock ?? 0;
      const reserved = reservations.get(product.sku) ?? 0;
      return { product, stock, reserved, available: stock - reserved };
    });
  });

  readonly rows = computed<StockRow[]>(() => {
    const q = this.search().trim().toLowerCase();
    const f = this.filter();
    const low = this.lowThreshold();
    let list = this.allRows();
    if (q) {
      list = list.filter(
        (r) => r.product.sku.toLowerCase().includes(q) || r.product.title.toLowerCase().includes(q)
      );
    }
    if (f === 'low') list = list.filter((r) => r.available > 0 && r.available <= low);
    else if (f === 'out') list = list.filter((r) => r.available <= 0);
    else if (f === 'reserved') list = list.filter((r) => r.reserved > 0);
    return list;
  });

  readonly totalStock = computed(() => this.allRows().reduce((s, r) => s + r.stock, 0));
  readonly totalReserved = computed(() => this.allRows().reduce((s, r) => s + r.reserved, 0));
  readonly totalAvailable = computed(() => this.allRows().reduce((s, r) => s + r.available, 0));
  readonly outCount = computed(() => this.allRows().filter((r) => r.available <= 0).length);

  catTitle(id: ProductCategory): string {
    return this.store.categories().find((c) => c.id === id)?.title ?? id;
  }

  setStock(sku: string, value: number | string): void {
    this.store.setStock(sku, +value || 0);
  }

  statusLabel(r: StockRow): string {
    if (r.available <= 0 && r.reserved > 0) return 'Перезаказ';
    if (r.available <= 0) return 'Нет';
    if (r.available <= this.lowThreshold()) return 'Заканчивается';
    return 'В наличии';
  }

  statusClass(r: StockRow): string {
    if (r.available <= 0) return 'adm-pill--hot';
    if (r.available <= this.lowThreshold()) return 'adm-pill--prog';
    return 'adm-pill--done';
  }

  exportCsv(): void {
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Артикул', 'Название', 'Категория', 'Остаток', 'Резерв', 'Доступно']];
    for (const r of this.rows()) {
      rows.push([
        r.product.sku, r.product.title, this.catTitle(r.product.category),
        String(r.stock), String(r.reserved), String(r.available),
      ]);
    }
    const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fob-warehouse-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.toast.ok('Складская ведомость скачана');
  }
}
