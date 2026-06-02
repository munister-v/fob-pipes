import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataStore } from '../services/data-store.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Обзор</h1>
        <p class="adm-sub">{{ today() }}</p>
      </div>
      <a class="adm-btn adm-btn--accent" routerLink="/admin/quotes" *ngIf="newCount() > 0">
        {{ newCount() }} новых заявок →
      </a>
    </header>

    <!-- KPI строка 1: заявки -->
    <div class="adm-stats">
      <a class="adm-stat" routerLink="/admin/quotes">
        <span class="adm-stat__num">{{ newCount() }}</span>
        <span class="adm-stat__lbl">новых заявок</span>
        <span class="adm-stat__sub" *ngIf="week() > 0">+{{ week() }} за 7 дней</span>
        <span class="adm-stat__sub" *ngIf="week() === 0">за 7 дней: нет</span>
      </a>
      <a class="adm-stat" routerLink="/admin/quotes">
        <span class="adm-stat__num">{{ store.quotes().length }}</span>
        <span class="adm-stat__lbl">всего заявок</span>
        <span class="adm-stat__sub">{{ totalQty() }} позиций суммарно</span>
      </a>
      <div class="adm-stat" [class.adm-stat--accent]="totalRevenue() > 0">
        <span class="adm-stat__num">
          <ng-container *ngIf="totalRevenue() > 0">{{ fmtRub(totalRevenue()) }}</ng-container>
          <ng-container *ngIf="totalRevenue() === 0">—</ng-container>
        </span>
        <span class="adm-stat__lbl">сумма всех заявок</span>
        <span class="adm-stat__sub">ориентировочно, руб.</span>
      </div>
      <div class="adm-stat">
        <span class="adm-stat__num">
          <ng-container *ngIf="avgCheck() > 0">{{ fmtRub(avgCheck()) }}</ng-container>
          <ng-container *ngIf="avgCheck() === 0">{{ avgLines() }} поз.</ng-container>
        </span>
        <span class="adm-stat__lbl">средний чек</span>
        <span class="adm-stat__sub">{{ avgCheck() > 0 ? 'руб.' : 'позиций в среднем' }}</span>
      </div>
    </div>

    <!-- KPI строка 2: воронка -->
    <div class="adm-stats adm-stats--sm" *ngIf="store.quotes().length > 0">
      <div class="adm-stat adm-stat--sm">
        <span class="adm-stat__num">{{ convRate() }}%</span>
        <span class="adm-stat__lbl">конверсия new→done</span>
      </div>
      <div class="adm-stat adm-stat--sm">
        <span class="adm-stat__num">{{ fmtRub(weekRevenue()) }}</span>
        <span class="adm-stat__lbl">выручка за 7 дней</span>
      </div>
      <div class="adm-stat adm-stat--sm">
        <span class="adm-stat__num">{{ fmtRub(monthRevenue()) }}</span>
        <span class="adm-stat__lbl">выручка за 30 дней</span>
      </div>
      <a class="adm-stat adm-stat--sm" routerLink="/admin/catalog">
        <span class="adm-stat__num">{{ store.products().length }}</span>
        <span class="adm-stat__lbl">товаров · {{ store.categories().length }} категорий</span>
      </a>
    </div>

    <div class="adm-grid-cols">
      <!-- 14-day chart -->
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>Заявки за 14 дней</h2>
          <span class="adm-sub">{{ chartTotal() }} всего</span>
        </div>
        <div class="adm-chart" *ngIf="chartTotal() > 0; else noData">
          <div class="adm-bar" *ngFor="let d of chart()" [title]="d.label + ': ' + d.n">
            <span class="adm-bar__fill" [style.height.%]="d.h"></span>
            <span class="adm-bar__x">{{ d.day }}</span>
          </div>
        </div>
        <ng-template #noData><div class="adm-empty">Пока нет данных за период.</div></ng-template>
      </section>

      <!-- Status breakdown -->
      <section class="adm-card">
        <div class="adm-card__head"><h2>Статусы заявок</h2></div>
        <div class="adm-breakdown" *ngIf="store.quotes().length > 0; else noStatus">
          <div class="adm-brk" *ngFor="let s of statuses()">
            <div class="adm-brk__top">
              <span class="adm-pill" [class.adm-pill--new]="s.id==='new'"
                    [class.adm-pill--prog]="s.id==='in_progress'"
                    [class.adm-pill--done]="s.id==='done'">{{ s.label }}</span>
              <span>
                <b>{{ s.n }}</b>
                <small *ngIf="s.revenue > 0" class="adm-sub"> · {{ fmtRub(s.revenue) }} р.</small>
              </span>
            </div>
            <div class="adm-track"><span [style.width.%]="s.pct"
              [class.adm-track--new]="s.id==='new'"
              [class.adm-track--prog]="s.id==='in_progress'"
              [class.adm-track--done]="s.id==='done'"></span></div>
          </div>
        </div>
        <ng-template #noStatus><div class="adm-empty">Заявок пока нет.</div></ng-template>
      </section>
    </div>

    <div class="adm-grid-cols">
      <!-- Recent quotes -->
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>Последние заявки</h2>
          <a class="adm-link" routerLink="/admin/quotes">Все →</a>
        </div>
        <div class="adm-empty" *ngIf="store.quotes().length === 0">
          Заявок пока нет. Когда клиент отправит заявку — она появится здесь.
        </div>
        <ul class="adm-recent" *ngIf="store.quotes().length > 0">
          <li *ngFor="let q of recent()">
            <span class="adm-recent__id">{{ q.id }}</span>
            <span class="adm-recent__name">{{ q.name || 'Без имени' }}</span>
            <span class="adm-recent__meta">
              {{ q.lines.length }} поз.
              <ng-container *ngIf="quoteSum(q) > 0"> · {{ fmtRub(quoteSum(q)) }} р.</ng-container>
              <ng-container *ngIf="!quoteSum(q)"> · {{ q.phone }}</ng-container>
            </span>
            <span class="adm-pill" [class.adm-pill--new]="q.status === 'new'"
                  [class.adm-pill--prog]="q.status === 'in_progress'"
                  [class.adm-pill--done]="q.status === 'done'">{{ statusLabel(q.status) }}</span>
          </li>
        </ul>
      </section>

      <!-- Top by revenue -->
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>Популярные товары</h2>
          <span class="adm-sub">по кол-ву в заявках</span>
        </div>
        <div class="adm-empty" *ngIf="topProducts().length === 0">Нет данных из заявок.</div>
        <ol class="adm-top" *ngIf="topProducts().length > 0">
          <li *ngFor="let t of topProducts()">
            <span class="adm-top__title">{{ t.title }}</span>
            <span class="adm-top__sku adm-mono">{{ t.sku }}</span>
            <span class="adm-top__n">
              {{ t.qty }} шт
              <small *ngIf="t.revenue > 0" class="adm-sub"> · {{ fmtRub(t.revenue) }} р.</small>
            </span>
          </li>
        </ol>
      </section>
    </div>
  `,
})
export class DashboardComponent {
  readonly store = inject(DataStore);
  private readonly DAY = 86_400_000;

  today(): string {
    return new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  readonly newCount = computed(() => this.store.quotes().filter((q) => q.status === 'new').length);
  readonly recent   = computed(() => [...this.store.quotes()].sort((a, b) => b.createdAt - a.createdAt).slice(0, 6));
  readonly week     = computed(() => this.since(7));

  readonly totalQty = computed(() =>
    this.store.quotes().reduce((s, q) => s + q.lines.reduce((a, l) => a + l.qty, 0), 0)
  );
  readonly avgLines = computed(() => {
    const qs = this.store.quotes();
    if (!qs.length) return 0;
    return Math.round((qs.reduce((s, q) => s + q.lines.length, 0) / qs.length) * 10) / 10;
  });

  quoteSum(q: { lines: { product: { priceRetail?: number }; qty: number }[] }): number {
    return q.lines.reduce((s, l) => s + (l.product.priceRetail ?? 0) * l.qty, 0);
  }

  readonly totalRevenue = computed(() =>
    this.store.quotes().reduce((s, q) => s + this.quoteSum(q), 0)
  );
  readonly avgCheck = computed(() => {
    const qs = this.store.quotes();
    if (!qs.length) return 0;
    const withPrice = qs.filter((q) => this.quoteSum(q) > 0);
    if (!withPrice.length) return 0;
    return Math.round(withPrice.reduce((s, q) => s + this.quoteSum(q), 0) / withPrice.length);
  });

  readonly convRate = computed(() => {
    const qs = this.store.quotes();
    if (!qs.length) return 0;
    const done = qs.filter((q) => q.status === 'done').length;
    return Math.round((done / qs.length) * 100);
  });

  weekRevenue  = computed(() => this.revenueInDays(7));
  monthRevenue = computed(() => this.revenueInDays(30));

  private revenueInDays(days: number): number {
    const cut = Date.now() - days * this.DAY;
    return this.store.quotes()
      .filter((q) => q.createdAt >= cut)
      .reduce((s, q) => s + this.quoteSum(q), 0);
  }

  private since(days: number): number {
    const cut = Date.now() - days * this.DAY;
    return this.store.quotes().filter((q) => q.createdAt >= cut).length;
  }

  readonly chart = computed(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const buckets: { ts: number; n: number; day: string; label: string }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * this.DAY);
      buckets.push({ ts: d.getTime(), n: 0, day: String(d.getDate()),
        label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }) });
    }
    for (const q of this.store.quotes()) {
      const d = new Date(q.createdAt);
      d.setHours(0, 0, 0, 0);
      const b = buckets.find((x) => x.ts === d.getTime());
      if (b) b.n++;
    }
    const max = Math.max(1, ...buckets.map((b) => b.n));
    return buckets.map((b) => ({ ...b, h: Math.round((b.n / max) * 100) }));
  });
  readonly chartTotal = computed(() => this.chart().reduce((s, b) => s + b.n, 0));

  readonly statuses = computed(() => {
    const qs = this.store.quotes();
    const total = qs.length || 1;
    const group = (id: string) => {
      const list = qs.filter((q) => q.status === id);
      return { n: list.length, revenue: list.reduce((s, q) => s + this.quoteSum(q), 0) };
    };
    return [
      { id: 'new',         label: 'Новые',     ...group('new') },
      { id: 'in_progress', label: 'В работе',  ...group('in_progress') },
      { id: 'done',        label: 'Закрытые',  ...group('done') },
    ].map((s) => ({ ...s, pct: Math.round((s.n / total) * 100) }));
  });

  readonly topProducts = computed(() => {
    const agg = new Map<string, { title: string; sku: string; qty: number; revenue: number }>();
    for (const q of this.store.quotes()) {
      for (const l of q.lines) {
        const cur = agg.get(l.product.sku) ?? { title: l.product.title, sku: l.product.sku, qty: 0, revenue: 0 };
        cur.qty += l.qty;
        cur.revenue += (l.product.priceRetail ?? 0) * l.qty;
        agg.set(l.product.sku, cur);
      }
    }
    return [...agg.values()].sort((a, b) => b.qty - a.qty).slice(0, 7);
  });

  fmtRub(n: number): string {
    if (n === 0) return '—';
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' млн';
    if (n >= 1_000)     return (n / 1_000).toFixed(0) + ' тыс';
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  }

  statusLabel(s: string): string {
    return s === 'new' ? 'Новая' : s === 'in_progress' ? 'В работе' : 'Закрыта';
  }
}
