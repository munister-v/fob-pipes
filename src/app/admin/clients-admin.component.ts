import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore, StoredQuote } from '../services/data-store.service';
import { normalizePhone } from '../models/crm.model';

interface ClientRow {
  phone: string;
  name: string;
  city: string;
  clientType: string;
  totalQuotes: number;
  totalSpent: number;
  lastAt: number;
  quotes: StoredQuote[];
}

@Component({
  selector: 'app-clients-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Клиенты</h1>
        <p class="adm-sub">
          {{ clients().length }} клиентов · {{ store.quotes().length }} заявок суммарно
          <span *ngIf="totalRevenue() > 0" class="adm-sub-accent"> · ~{{ fmt(totalRevenue()) }} руб.</span>
        </p>
      </div>
      <div class="adm-head__actions">
        <input class="adm-search" type="text" placeholder="Имя, телефон, город…"
               [ngModel]="search()" (ngModelChange)="search.set($event)" />
        <button class="adm-btn" (click)="exportCsv()" [disabled]="clients().length === 0">↓ CSV</button>
      </div>
    </header>

    <div class="adm-toolbar">
      <div class="adm-tabs">
        <button [class.is-active]="sort() === 'last'" (click)="sort.set('last')">Последний контакт</button>
        <button [class.is-active]="sort() === 'spent'" (click)="sort.set('spent')">По сумме</button>
        <button [class.is-active]="sort() === 'orders'" (click)="sort.set('orders')">По заявкам</button>
      </div>
      <div class="adm-tabs">
        <button [class.is-active]="typeFilter() === 'all'" (click)="typeFilter.set('all')">Все типы</button>
        <button [class.is-active]="typeFilter() === 'private'" (click)="typeFilter.set('private')">Частные</button>
        <button [class.is-active]="typeFilter() === 'shop'" (click)="typeFilter.set('shop')">Магазины</button>
        <button [class.is-active]="typeFilter() === 'construction'" (click)="typeFilter.set('construction')">Объекты</button>
      </div>
    </div>

    <div class="adm-empty adm-empty--big" *ngIf="clients().length === 0 && store.quotes().length === 0">
      Заявок пока нет — клиенты появятся автоматически.
    </div>
    <div class="adm-empty adm-empty--big" *ngIf="clients().length === 0 && store.quotes().length > 0">
      Ничего не найдено по запросу «{{ search() }}».
    </div>

    <div class="adm-clients">
      <article class="adm-client" *ngFor="let c of clients()">
        <div class="adm-client__bar" (click)="toggle(c.phone)">
          <div class="adm-client__avatar">{{ initial(c.name) }}</div>
          <div class="adm-client__info">
            <span class="adm-client__name">{{ c.name || 'Без имени' }}</span>
            <span class="adm-client__phone adm-mono">{{ c.phone }}</span>
          </div>
          <span class="adm-pill" [ngClass]="typePillClass(c.clientType)">{{ typeLabel(c.clientType) }}</span>
          <div class="adm-client__stats">
            <div>
              <span class="adm-client__val">{{ c.totalQuotes }}</span>
              <span class="adm-client__lbl">заявок</span>
            </div>
            <div *ngIf="c.totalSpent > 0">
              <span class="adm-client__val adm-client__val--green">{{ fmt(c.totalSpent) }}</span>
              <span class="adm-client__lbl">руб.</span>
            </div>
          </div>
          <span class="adm-client__last">{{ c.lastAt | date:'dd.MM.yy' }}</span>
          <span class="adm-client__city">{{ c.city || '—' }}</span>
          <span class="adm-quote__caret" [class.is-open]="open() === c.phone">▾</span>
        </div>

        <div class="adm-client__body" *ngIf="open() === c.phone">
          <div class="adm-client__actions">
            <a class="adm-btn adm-btn--sm" [href]="'tel:' + telClean(c.phone)">Позвонить</a>
          </div>
          <table class="adm-table adm-table--mini adm-client__hist">
            <thead>
              <tr>
                <th>ID</th><th>Дата</th><th>Позиций</th><th>Сумма</th><th>Статус</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let q of c.quotes">
                <td class="adm-mono">{{ q.id }}</td>
                <td class="adm-mono">{{ q.createdAt | date:'dd.MM.yy HH:mm' }}</td>
                <td>{{ q.lines.length }}</td>
                <td class="adm-mono">{{ quoteSum(q) > 0 ? fmt(quoteSum(q)) + ' р.' : '—' }}</td>
                <td><span class="adm-pill" [ngClass]="statusPillClass(q.status)">{{ statusLabel(q.status) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
    </div>
  `,
})
export class ClientsAdminComponent {
  readonly store = inject(DataStore);

  readonly search = signal('');
  readonly sort = signal<'last' | 'spent' | 'orders'>('last');
  readonly typeFilter = signal<'all' | string>('all');
  readonly open = signal<string | null>(null);

  readonly totalRevenue = computed(() =>
    this.clients().reduce((s, c) => s + c.totalSpent, 0)
  );

  readonly clients = computed<ClientRow[]>(() => {
    const q = this.search().trim().toLowerCase();
    const tf = this.typeFilter();
    const s = this.sort();

    const map = new Map<string, ClientRow>();
    for (const quote of this.store.quotes()) {
      const key = normalizePhone(quote.phone || '');
      if (!key) continue;
      const existing = map.get(key);
      const spent = this.quoteSum(quote);
      if (!existing) {
        map.set(key, {
          phone: quote.phone || '',
          name: quote.name || '',
          city: quote.city || '',
          clientType: quote.clientType || 'other',
          totalQuotes: 1,
          totalSpent: spent,
          lastAt: quote.createdAt,
          quotes: [quote],
        });
      } else {
        existing.totalQuotes++;
        existing.totalSpent += spent;
        if (quote.createdAt > existing.lastAt) {
          existing.lastAt = quote.createdAt;
          existing.name = quote.name || existing.name;
          existing.city = quote.city || existing.city;
          existing.clientType = quote.clientType || existing.clientType;
        }
        existing.quotes.push(quote);
      }
    }

    let list = [...map.values()];
    if (tf !== 'all') list = list.filter((c) => c.clientType === tf);
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.city || '').toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (s === 'spent') return b.totalSpent - a.totalSpent;
      if (s === 'orders') return b.totalQuotes - a.totalQuotes;
      return b.lastAt - a.lastAt;
    });

    return list;
  });

  quoteSum(q: StoredQuote): number {
    return q.lines.reduce((s, l) => s + (l.product.priceRetail ?? 0) * l.qty, 0);
  }

  fmt(n: number): string {
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  }

  initial(name: string): string {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  telClean(p: string): string { return p.replace(/[^\d+]/g, ''); }

  toggle(phone: string): void {
    this.open.update((cur) => (cur === phone ? null : phone));
  }

  typeLabel(t: string): string {
    return { private: 'Частный', shop: 'Магазин', construction: 'Объект', other: 'Другое' }[t] ?? t;
  }

  typePillClass(t: string): string {
    return { private: '', shop: 'adm-pill--prog', construction: 'adm-pill--new', other: '' }[t] ?? '';
  }

  statusLabel(s: string): string {
    return s === 'new' ? 'Новая' : s === 'in_progress' ? 'В работе' : 'Закрыта';
  }

  statusPillClass(s: string): string {
    return s === 'new' ? 'adm-pill--new' : s === 'in_progress' ? 'adm-pill--prog' : 'adm-pill--done';
  }

  exportCsv(): void {
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Имя', 'Телефон', 'Город', 'Тип', 'Заявок', 'Сумма', 'Последний контакт']];
    for (const c of this.clients()) {
      rows.push([
        c.name, c.phone, c.city || '', this.typeLabel(c.clientType),
        String(c.totalQuotes), c.totalSpent > 0 ? String(c.totalSpent) : '',
        new Date(c.lastAt).toLocaleDateString('ru-RU'),
      ]);
    }
    const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `fob-clients-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
