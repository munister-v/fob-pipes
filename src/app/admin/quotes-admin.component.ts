import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore, QuoteStatus, StoredQuote } from '../services/data-store.service';
import { ToastService } from './toast.service';
import { PdfService } from '../services/pdf.service';
import { ExcelService } from '../services/excel.service';

const DAY_MS = 86_400_000;

@Component({
  selector: 'app-quotes-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Заявки</h1>
        <p class="adm-sub">
          {{ store.quotes().length }} всего · {{ newCount() }} новых · {{ filtered().length }} показано
          <span *ngIf="totalSum() > 0" class="adm-sub-accent">· ~{{ fmtSum(totalSum()) }} руб.</span>
        </p>
      </div>
      <div class="adm-head__actions">
        <input class="adm-search" type="text" placeholder="Поиск: имя, телефон, артикул…"
               [ngModel]="search()" (ngModelChange)="search.set($event)" />
        <button class="adm-btn" (click)="exportExcel()" [disabled]="store.quotes().length === 0" title="Скачать Excel">↓ Excel</button>
        <button class="adm-btn" (click)="exportPdfReport()" [disabled]="store.quotes().length === 0" title="Отчёт PDF">↓ PDF отчёт</button>
        <button class="adm-btn" (click)="exportCsv()" [disabled]="store.quotes().length === 0">↓ CSV</button>
        <button class="adm-btn" (click)="exportJson()" [disabled]="store.quotes().length === 0">↓ JSON</button>
      </div>
    </header>

    <!-- Date range filter -->
    <div class="adm-date-bar">
      <span class="adm-date-bar__lbl">Период:</span>
      <div class="adm-date-presets">
        <button class="adm-chip" [class.is-active]="datePreset() === 'all'" (click)="setPreset('all')">Всё время</button>
        <button class="adm-chip" [class.is-active]="datePreset() === '7'" (click)="setPreset('7')">7 дней</button>
        <button class="adm-chip" [class.is-active]="datePreset() === '30'" (click)="setPreset('30')">30 дней</button>
        <button class="adm-chip" [class.is-active]="datePreset() === '90'" (click)="setPreset('90')">3 мес.</button>
        <button class="adm-chip" [class.is-active]="datePreset() === 'custom'" (click)="setPreset('custom')">Диапазон</button>
      </div>
      <div class="adm-date-inputs" *ngIf="datePreset() === 'custom'">
        <input type="date" class="adm-date-input" [ngModel]="dateFrom()" (ngModelChange)="dateFrom.set($event)" />
        <span>—</span>
        <input type="date" class="adm-date-input" [ngModel]="dateTo()" (ngModelChange)="dateTo.set($event)" />
      </div>
    </div>

    <div class="adm-toolbar">
      <div class="adm-tabs">
        <button [class.is-active]="filter() === 'all'" (click)="filter.set('all')">Все <i>{{ store.quotes().length }}</i></button>
        <button [class.is-active]="filter() === 'new'" (click)="filter.set('new')">Новые <i>{{ count('new') }}</i></button>
        <button [class.is-active]="filter() === 'in_progress'" (click)="filter.set('in_progress')">В работе <i>{{ count('in_progress') }}</i></button>
        <button [class.is-active]="filter() === 'done'" (click)="filter.set('done')">Закрытые <i>{{ count('done') }}</i></button>
      </div>
      <div style="display:flex;gap:10px;align-items:center;">
        <label class="adm-check">
          <input type="checkbox" [checked]="allSelected()" (change)="toggleSelectAll()" />
          Выбрать все
        </label>
        <button class="adm-sort" (click)="toggleSort()">
          {{ sort() === 'new' ? '↓ Сначала новые' : '↑ Сначала старые' }}
        </button>
      </div>
    </div>

    <!-- Bulk actions bar -->
    <div class="adm-bulk-bar" *ngIf="selected().size > 0">
      <span class="adm-bulk-bar__count">{{ selected().size }} выбрано</span>
      <div class="adm-bulk-bar__actions">
        <span>Изменить статус:</span>
        <button class="adm-chip" (click)="bulkSetStatus('new')">Новые</button>
        <button class="adm-chip" (click)="bulkSetStatus('in_progress')">В работе</button>
        <button class="adm-chip" (click)="bulkSetStatus('done')">Закрытые</button>
        <button class="adm-btn adm-btn--sm adm-btn--danger" (click)="bulkDelete()">Удалить</button>
        <button class="adm-btn adm-btn--sm" (click)="clearSelection()">Отмена</button>
      </div>
    </div>

    <div class="adm-empty adm-empty--big" *ngIf="filtered().length === 0">
      {{ search() ? 'Ничего не найдено.' : 'Нет заявок в этой категории.' }}
    </div>

    <div class="adm-quotes">
      <article class="adm-quote" *ngFor="let q of filtered()"
               [class.is-new]="q.status === 'new'"
               [class.is-selected]="selected().has(q.id)">
        <div class="adm-quote__bar" (click)="toggle(q.id)">
          <label class="adm-quote__chk" (click)="$event.stopPropagation()">
            <input type="checkbox" [checked]="selected().has(q.id)"
                   (change)="toggleSelect(q.id, $event)" />
          </label>
          <span class="adm-quote__id adm-mono">{{ q.id }}</span>
          <span class="adm-quote__name">{{ q.name || 'Без имени' }}</span>
          <span class="adm-quote__phone adm-mono">{{ q.phone }}</span>
          <span class="adm-quote__sum">
            {{ q.lines.length }} поз.
            <ng-container *ngIf="quoteSum(q) > 0"> · {{ fmtSum(quoteSum(q)) }} р.</ng-container>
          </span>
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
                <button class="adm-btn adm-btn--sm" (click)="copy(q.phone)">Копировать</button>
              </div>

              <h4 class="adm-quote__noteh">Заметка менеджера</h4>
              <textarea class="adm-note-input" rows="2" placeholder="Внутренний комментарий…"
                        [ngModel]="q.note || ''" (ngModelChange)="setNote(q, $event)"></textarea>
            </div>
            <div>
              <h4>Позиции ({{ q.lines.length }})</h4>
              <table class="adm-table adm-table--mini">
                <thead>
                  <tr>
                    <th class="adm-mono">Артикул</th>
                    <th>Наименование</th>
                    <th>Кол-во</th>
                    <th *ngIf="quoteSum(q) > 0">Цена</th>
                    <th *ngIf="quoteSum(q) > 0">Сумма</th>
                  </tr>
                </thead>
                <tr *ngFor="let l of q.lines">
                  <td class="adm-mono">{{ l.product.sku }}</td>
                  <td>{{ l.product.title }}</td>
                  <td class="adm-mono">×{{ l.qty }} {{ l.product.unit ?? 'шт' }}</td>
                  <td class="adm-mono" *ngIf="quoteSum(q) > 0">
                    {{ (l.product.priceRetail ?? 0) > 0 ? fmtSum(l.product.priceRetail!) : '—' }}
                  </td>
                  <td class="adm-mono" *ngIf="quoteSum(q) > 0">
                    {{ (l.product.priceRetail ?? 0) > 0 ? fmtSum(l.product.priceRetail! * l.qty) : '—' }}
                  </td>
                </tr>
                <tr *ngIf="quoteSum(q) > 0" class="adm-table__total">
                  <td colspan="3"></td>
                  <td>Итого:</td>
                  <td class="adm-mono"><b>{{ fmtSum(quoteSum(q)) }} руб.</b></td>
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
            <div class="adm-quote__foot-actions">
              <button class="adm-btn adm-btn--sm" (click)="downloadKP(q)" title="Коммерческое предложение PDF">↓ КП (PDF)</button>
              <button class="adm-btn adm-btn--sm" (click)="downloadInvoice(q)" title="Счёт на оплату PDF">↓ Счёт (PDF)</button>
              <button class="adm-icon adm-icon--del" (click)="remove(q)" title="Удалить заявку">✕ Удалить</button>
            </div>
          </div>
        </div>
      </article>
    </div>
  `,
})
export class QuotesAdminComponent {
  readonly store = inject(DataStore);
  private readonly toast = inject(ToastService);
  private readonly pdf = inject(PdfService);
  private readonly excel = inject(ExcelService);

  readonly filter = signal<'all' | QuoteStatus>('all');
  readonly search = signal('');
  readonly sort = signal<'new' | 'old'>('new');
  readonly open = signal<string | null>(null);
  readonly selected = signal<Set<string>>(new Set());
  readonly datePreset = signal<'all' | '7' | '30' | '90' | 'custom'>('all');
  readonly dateFrom = signal('');
  readonly dateTo = signal('');

  readonly newCount = computed(() => this.count('new'));

  readonly totalSum = computed(() =>
    this.filtered().reduce((s, q) => s + this.quoteSum(q), 0)
  );

  readonly allSelected = computed(() => {
    const f = this.filtered();
    const sel = this.selected();
    return f.length > 0 && f.every((q) => sel.has(q.id));
  });

  count(s: QuoteStatus): number {
    return this.store.quotes().filter((q) => q.status === s).length;
  }

  setPreset(p: 'all' | '7' | '30' | '90' | 'custom'): void {
    this.datePreset.set(p);
  }

  toggleSelect(id: string, ev: Event): void {
    const checked = (ev.target as HTMLInputElement).checked;
    this.selected.update((s) => {
      const next = new Set(s);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }

  toggleSelectAll(): void {
    if (this.allSelected()) {
      this.selected.set(new Set());
    } else {
      this.selected.set(new Set(this.filtered().map((q) => q.id)));
    }
  }

  clearSelection(): void { this.selected.set(new Set()); }

  bulkSetStatus(status: QuoteStatus): void {
    const ids = [...this.selected()];
    ids.forEach((id) => this.store.setQuoteStatus(id, status));
    this.clearSelection();
    this.toast.ok(`${ids.length} заявок → «${this.label(status)}`);
  }

  bulkDelete(): void {
    const ids = [...this.selected()];
    if (!confirm(`Удалить ${ids.length} заявок?`)) return;
    ids.forEach((id) => this.store.deleteQuote(id));
    this.clearSelection();
    this.toast.ok(`Удалено ${ids.length} заявок`);
  }

  quoteSum(q: StoredQuote): number {
    return q.lines.reduce((s, l) => s + (l.product.priceRetail ?? 0) * l.qty, 0);
  }

  fmtSum(n: number): string {
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  }

  readonly filtered = computed(() => {
    const f = this.filter();
    const q = this.search().trim().toLowerCase();
    const preset = this.datePreset();
    let list = this.store.quotes();

    // date filter
    if (preset !== 'all') {
      let from = 0;
      let to = Date.now();
      if (preset === 'custom') {
        if (this.dateFrom()) from = new Date(this.dateFrom()).getTime();
        if (this.dateTo()) to = new Date(this.dateTo()).getTime() + DAY_MS - 1;
      } else {
        from = Date.now() - Number(preset) * DAY_MS;
      }
      list = list.filter((x) => x.createdAt >= from && x.createdAt <= to);
    }

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

  // ── PDF ────────────────────────────────────────────────────────────

  async downloadKP(q: StoredQuote): Promise<void> {
    this.toast.ok('Подготовка КП…');
    try {
      await this.pdf.quoteKP(q, this.store.content());
      this.toast.ok('КП скачан');
    } catch (e) {
      console.error('[pdf] quoteKP', e);
      this.toast.err('Ошибка генерации PDF: ' + String(e));
    }
  }

  async downloadInvoice(q: StoredQuote): Promise<void> {
    this.toast.ok('Подготовка счёта…');
    try {
      const num = q.id.replace('Q-', '');
      await this.pdf.invoice(q, this.store.content(), `ФОБ-${num}`);
      this.toast.ok('Счёт скачан');
    } catch (e) {
      console.error('[pdf] invoice', e);
      this.toast.err('Ошибка генерации PDF: ' + String(e));
    }
  }

  async exportPdfReport(): Promise<void> {
    this.toast.ok('Подготовка отчёта…');
    try {
      const period = new Date().toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      await this.pdf.reportQuotes(this.filtered(), period, this.store.content());
      this.toast.ok('PDF-отчёт скачан');
    } catch (e) {
      console.error('[pdf] report', e);
      this.toast.err('Ошибка генерации PDF: ' + String(e));
    }
  }

  // ── Excel ──────────────────────────────────────────────────────────

  async exportExcel(): Promise<void> {
    await this.excel.exportQuotes(this.store.quotes());
    this.toast.ok('Excel скачан');
  }

  // ── CSV / JSON ─────────────────────────────────────────────────────

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
      ['ID', 'Дата', 'Имя', 'Телефон', 'Город', 'Тип', 'Статус', 'Позиции', 'Сумма', 'Комментарий', 'Заметка'],
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
        this.quoteSum(q) > 0 ? String(this.quoteSum(q)) : '',
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
