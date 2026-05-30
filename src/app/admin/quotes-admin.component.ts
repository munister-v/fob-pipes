import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataStore, QuoteStatus, StoredQuote } from '../services/data-store.service';

@Component({
  selector: 'app-quotes-admin',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Заявки</h1>
        <p class="adm-sub">{{ store.quotes().length }} всего · {{ newCount() }} новых</p>
      </div>
      <div class="adm-head__actions">
        <div class="adm-tabs">
          <button [class.is-active]="filter() === 'all'" (click)="filter.set('all')">Все</button>
          <button [class.is-active]="filter() === 'new'" (click)="filter.set('new')">Новые</button>
          <button [class.is-active]="filter() === 'in_progress'" (click)="filter.set('in_progress')">В работе</button>
          <button [class.is-active]="filter() === 'done'" (click)="filter.set('done')">Закрытые</button>
        </div>
        <button class="adm-btn" (click)="exportJson()" [disabled]="store.quotes().length === 0">↓ Экспорт</button>
      </div>
    </header>

    <div class="adm-empty adm-empty--big" *ngIf="filtered().length === 0">
      Нет заявок в этой категории.
    </div>

    <div class="adm-quotes">
      <article class="adm-quote" *ngFor="let q of filtered()">
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
  readonly filter = signal<'all' | QuoteStatus>('all');
  readonly open = signal<string | null>(null);

  readonly newCount = computed(() => this.store.quotes().filter((q) => q.status === 'new').length);
  readonly filtered = computed(() => {
    const f = this.filter();
    const list = this.store.quotes();
    return f === 'all' ? list : list.filter((q) => q.status === f);
  });

  label(s: QuoteStatus): string {
    return s === 'new' ? 'Новая' : s === 'in_progress' ? 'В работе' : 'Закрыта';
  }
  clientType(t: string): string {
    return { private: 'Частный', shop: 'Магазин', construction: 'Строительный объект', other: 'Другое' }[t] ?? t;
  }

  toggle(id: string): void {
    this.open.update((cur) => (cur === id ? null : id));
  }
  setStatus(q: StoredQuote, s: QuoteStatus): void {
    this.store.setQuoteStatus(q.id, s);
  }
  remove(q: StoredQuote): void {
    if (confirm(`Удалить заявку ${q.id}?`)) this.store.deleteQuote(q.id);
  }

  exportJson(): void {
    const blob = new Blob([JSON.stringify(this.store.quotes(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fob-quotes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
