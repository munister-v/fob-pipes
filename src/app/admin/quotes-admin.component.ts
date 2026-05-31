import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore, QuoteStatus, StoredQuote } from '../services/data-store.service';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-quotes-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Заявки</h1>
        <p class="adm-sub">{{ store.quotes().length }} всего · {{ newCount() }} новых · {{ filtered().length }} показано</p>
      </div>
      <div class="adm-head__actions">
        <input class="adm-search" type="text" placeholder="Поиск: имя, телефон, артикул…"
               [ngModel]="search()" (ngModelChange)="search.set($event)" />
        <button class="adm-btn" (click)="exportCsv()" [disabled]="store.quotes().length === 0">↓ CSV</button>
        <button class="adm-btn" (click)="exportJson()" [disabled]="store.quotes().length === 0">↓ JSON</button>
      </div>
    </header>

    <div class="adm-toolbar">
      <div class="adm-tabs">
        <button [class.is-active]="filter() === 'all'" (click)="filter.set('all')">Все <i>{{ store.quotes().length }}</i></button>
        <button [class.is-active]="filter() === 'new'" (click)="filter.set('new')">Новые <i>{{ count('new') }}</i></button>
        <button [class.is-active]="filter() === 'in_progress'" (click)="filter.set('in_progress')">В работе <i>{{ count('in_progress') }}</i></button>
        <button [class.is-active]="filter() === 'done'" (click)="filter.set('done')">Закрытые <i>{{ count('done') }}</i></button>
      </div>
      <button class="adm-sort" (click)="toggleSort()">
        {{ sort() === 'new' ? '↓ Сначала новые' : '↑ Сначала старые' }}
      </button>
    </div>

    <div class="adm-empty adm-empty--big" *ngIf="filtered().length === 0">
      {{ search() ? 'Ничего не найдено.' : 'Нет заявок в этой категории.' }}
    </div>

    <div class="adm-quotes">
      <article class="adm-quote" *ngFor="let q of filtered()" [class.is-new]="q.status === 'new'">
        <div class="adm-quote__bar" (click)="toggle(q.id)">
          <span class="adm-quote__id adm-mono">{{ q.id }}</span>
          <span class="adm-quote__name">{{ q.name || 'Без имени' }}</span>
          <span class="adm-quote__phone adm-mono">{{ q.phone }}</span>
          <span class="adm-quote__sum">{{ q.lines.length }} поз.</span>
          <span class="adm-quote__date">{{ q.createdAt | date: 'dd.MM.yy HH:mm' }}</span>
          <span class="adm-pill" [class.adm-pill--new]="q.status === 'new'"
                [class.adm-pill--prog]="q.status === 'in_progress'"
                [class.adm-pill--done]="q.status === 'done'">{{ label(q.status) }}</span>
          <span class="adm-quote__caret" [class.is-open]="open() === q.id">▾</span>
        </div>

        <div class="adm-quote__body" *ngIf="open() === q.id">
          <div class="adm-quote__cols">
            <div>
              <h4>Контакт</h4>
              <dl class="adm-dl">
                <dt>Имя</dt><dd>{{ q.name || '—' }}</dd>
                <dt>Телефон</dt><dd class="adm-mono">{{ q.phone || '—' }}</dd>
                <dt>Город</dt><dd>{{ q.city || '—' }}</dd>
                <dt>Тип</dt><dd>{{ clientType(q.clientType) }}</dd>
                <dt>Комментарий</dt><dd>{{ q.comment || '—' }}</dd>
              </dl>
              <div class="adm-quote__contact" *ngIf="q.phone">
                <a class="adm-btn adm-btn--sm" [href]="'tel:' + tel(q.phone)">Позвонить</a>
                <a class="adm-btn adm-btn--sm" [href]="'viber://chat?number=' + telEnc(q.phone)" target="_blank" rel="noopener">Viber</a>
                <button class="adm-btn adm-btn--sm" (click)="copy(q.phone)">Копировать</button>
              </div>

              <h4 class="adm-quote__noteh">Заметка менеджера</h4>
              <textarea class="adm-note-input" rows="2" placeholder="Внутренний комментарий…"
                        [ngModel]="q.note || ''" (ngModelChange)="setNote(q, $event)"></textarea>
            </div>
            <div>
              <h4>Позиции ({{ q.lines.length }})</h4>
              <table class="adm-table adm-table--mini">
                <tr *ngFor="let l of q.lines">
                  <td class="adm-mono">{{ l.product.sku }}</td>
                  <td>{{ l.product.title }}</td>
                  <td class="adm-mono">×{{ l.qty }}</td>
                </tr>
              </table>
            </div>
          </div>

          <div class="adm-quote__foot">
            <div class="adm-quote__status">
              <span>Статус:</span>
              <button class="adm-chip" [class.is-active]="q.status === 'new'" (click)="setStatus(q, 'new')">Новая</button>
              <button class="adm-chip" [class.is-active]="q.status === 'in_progress'" (click)="setStatus(q, 'in_progress')">В работе</button>
              <button class="adm-chip" [class.is-active]="q.status === 'done'" (click)="setStatus(q, 'done')">Закрыта</button>
            </div>
            <button class="adm-icon adm-icon--del" (click)="remove(q)" title="Удалить заявку">✕ Удалить</button>
          </div>
        </div>
      </article>
    </div>
  `,
})
export class QuotesAdminComponent {
  readonly store = inject(DataStore);
  private readonly toast = inject(ToastService);

  readonly filter = signal<'all' | QuoteStatus>('all');
  readonly search = signal('');
  readonly sort = signal<'new' | 'old'>('new');
  readonly open = signal<string | null>(null);

  readonly newCount = computed(() => this.count('new'));

  count(s: QuoteStatus): number {
    return this.store.quotes().filter((q) => q.status === s).length;
  }

  readonly filtered = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    let list = this.store.quotes();
    if (f !== 'all') list = list.filter((x) => x.status === f);
    if (q) {
      list = list.filter(
        (x) =>
          (x.name || '').toLowerCase().includes(q) ||
          (x.phone || '').toLowerCase().includes(q) ||
          (x.city || '').toLowerCase().includes(q) ||
          x.id.toLowerCase().includes(q) ||
          x.lines.some((l) => l.product.sku.toLowerCase().includes(q) || l.product.title.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) =>
      this.sort() === 'new' ? b.createdAt - a.createdAt : a.createdAt - b.createdAt
    );
    return list;
  });

  toggleSort(): void {
    this.sort.update((s) => (s === 'new' ? 'old' : 'new'));
  }

  label(s: QuoteStatus): string {
    return s === 'new' ? 'Новая' : s === 'in_progress' ? 'В работе' : 'Закрыта';
  }
  clientType(t: string): string {
    return { private: 'Частный', shop: 'Магазин', construction: 'Строительный объект', other: 'Другое' }[t] ?? t;
  }
  tel(p: string): string {
    return p.replace(/[^\d+]/g, '');
  }
  telEnc(p: string): string {
    return encodeURIComponent(this.tel(p));
  }

  toggle(id: string): void {
    this.open.update((cur) => (cur === id ? null : id));
  }
  setStatus(q: StoredQuote, s: QuoteStatus): void {
    this.store.setQuoteStatus(q.id, s);
    this.toast.ok('Статус обновлён');
  }
  setNote(q: StoredQuote, note: string): void {
    this.store.setQuoteNote(q.id, note);
  }
  remove(q: StoredQuote): void {
    if (confirm(`Удалить заявку ${q.id}?`)) {
      this.store.deleteQuote(q.id);
      this.toast.ok('Заявка удалена');
    }
  }
  copy(text: string): void {
    navigator.clipboard?.writeText(text).then(
      () => this.toast.ok('Скопировано'),
      () => this.toast.err('Не удалось скопировать')
    );
  }

  exportJson(): void {
    this.download(
      JSON.stringify(this.store.quotes(), null, 2),
      'application/json',
      `fob-quotes-${this.stamp()}.json`
    );
  }

  exportCsv(): void {
    const esc = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['ID', 'Дата', 'Имя', 'Телефон', 'Город', 'Тип', 'Статус', 'Позиции', 'Комментарий', 'Заметка'],
    ];
    for (const q of this.filtered()) {
      rows.push([
        q.id,
        new Date(q.createdAt).toLocaleString('ru-RU'),
        q.name || '',
        q.phone || '',
        q.city || '',
        this.clientType(q.clientType),
        this.label(q.status),
        q.lines.map((l) => `${l.product.sku}×${l.qty}`).join('; '),
        q.comment || '',
        q.note || '',
      ]);
    }
    const csv = '﻿' + rows.map((r) => r.map(esc).join(';')).join('\r\n');
    this.download(csv, 'text/csv', `fob-quotes-${this.stamp()}.csv`);
    this.toast.ok('CSV скачан');
  }

  private stamp(): string {
    return new Date().toISOString().slice(0, 10);
  }
  private download(data: string, type: string, name: string): void {
    const url = URL.createObjectURL(new Blob([data], { type }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }
}
