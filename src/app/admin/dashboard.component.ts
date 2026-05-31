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
        <p class="adm-sub">Сводка по каталогу и заявкам</p>
      </div>
      <a class="adm-btn adm-btn--accent" routerLink="/admin/quotes" *ngIf="newCount() > 0">
        {{ newCount() }} новых заявок →
      </a>
    </header>

    <!-- KPIs -->
    <div class="adm-stats">
      <a class="adm-stat" routerLink="/admin/quotes">
        <span class="adm-stat__num">{{ newCount() }}</span>
        <span class="adm-stat__lbl">новых заявок</span>
        <span class="adm-stat__sub" *ngIf="week() > 0">+{{ week() }} за 7 дней</span>
      </a>
      <a class="adm-stat" routerLink="/admin/quotes">
        <span class="adm-stat__num">{{ store.quotes().length }}</span>
        <span class="adm-stat__lbl">всего заявок</span>
        <span class="adm-stat__sub">{{ totalQty() }} позиций суммарно</span>
      </a>
      <a class="adm-stat" routerLink="/admin/catalog">
        <span class="adm-stat__num">{{ store.products().length }}</span>
        <span class="adm-stat__lbl">товаров в каталоге</span>
        <span class="adm-stat__sub">{{ store.categories().length }} категорий</span>
      </a>
      <div class="adm-stat">
        <span class="adm-stat__num">{{ avgLines() }}</span>
        <span class="adm-stat__lbl">позиций в заявке</span>
        <span class="adm-stat__sub">в среднем</span>
      </div>
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
              <b>{{ s.n }}</b>
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
            <span class="adm-recent__meta">{{ q.lines.length }} поз. · {{ q.phone }}</span>
            <span class="adm-pill" [class.adm-pill--new]="q.status === 'new'"
                  [class.adm-pill--prog]="q.status === 'in_progress'"
                  [class.adm-pill--done]="q.status === 'done'">{{ statusLabel(q.status) }}</span>
          </li>
        </ul>
      </section>

      <!-- Top requested products -->
      <section class="adm-card">
        <div class="adm-card__head"><h2>Чаще всего запрашивают</h2></div>
        <div class="adm-empty" *ngIf="topProducts().length === 0">Нет данных из заявок.</div>
        <ol class="adm-top" *ngIf="topProducts().length > 0">
          <li *ngFor="let t of topProducts()">
            <span class="adm-top__title">{{ t.title }}</span>
            <span class="adm-top__sku adm-mono">{{ t.sku }}</span>
            <span class="adm-top__n">{{ t.qty }} шт</span>
          </li>
        </ol>
      </section>
    </div>
  `,
})
export class DashboardComponent {
  readonly store = inject(DataStore);

  private readonly DAY = 86_400_000;

  readonly newCount = computed(() => this.store.quotes().filter((q) => q.status === 'new').length);
  readonly recent = computed(() => this.store.quotes().slice(0, 6));
  readonly week = computed(() => this.since(7));
  readonly totalQty = computed(() =>
    this.store.quotes().reduce((s, q) => s + q.lines.reduce((a, l) => a + l.qty, 0), 0)
  );
  readonly avgLines = computed(() => {
    const qs = this.store.quotes();
    if (!qs.length) return 0;
    return Math.round((qs.reduce((s, q) => s + q.lines.length, 0) / qs.length) * 10) / 10;
  });

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
      buckets.push({
        ts: d.getTime(),
        n: 0,
        day: String(d.getDate()),
        label: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' }),
      });
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
    const count = (id: string) => qs.filter((q) => q.status === id).length;
    return [
      { id: 'new', label: 'Новые', n: count('new') },
      { id: 'in_progress', label: 'В работе', n: count('in_progress') },
      { id: 'done', label: 'Закрытые', n: count('done') },
    ].map((s) => ({ ...s, pct: Math.round((s.n / total) * 100) }));
  });

  readonly topProducts = computed(() => {
    const agg = new Map<string, { title: string; sku: string; qty: number }>();
    for (const q of this.store.quotes()) {
      for (const l of q.lines) {
        const cur = agg.get(l.product.sku) ?? { title: l.product.title, sku: l.product.sku, qty: 0 };
        cur.qty += l.qty;
        agg.set(l.product.sku, cur);
      }
    }
    return [...agg.values()].sort((a, b) => b.qty - a.qty).slice(0, 6);
  });

  statusLabel(s: string): string {
    return s === 'new' ? 'Новая' : s === 'in_progress' ? 'В работе' : 'Закрыта';
  }
}
