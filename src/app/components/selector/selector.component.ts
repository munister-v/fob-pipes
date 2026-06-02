import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore } from '../../services/data-store.service';
import { QuoteService } from '../../services/quote.service';
import { Product, ProductCategory, Usage } from '../../models/product.model';

/** Категории фасонных частей, которые подбираем к трубе данного диаметра. */
const FITTING_CATS: { id: ProductCategory; label: string }[] = [
  { id: 'bend',     label: 'Отводы / колена' },
  { id: 'tee',      label: 'Тройники' },
  { id: 'coupling', label: 'Муфты' },
  { id: 'reducer',  label: 'Редукции / переходы' },
  { id: 'revision', label: 'Ревизии' },
  { id: 'plug',     label: 'Заглушки' },
];

/** Нормативные минимальные уклоны самотёчной канализации (СП 30.13330 / СНиП 2.04.01-85). */
const SLOPE: Record<number, number> = {
  32: 0.035, 40: 0.035, 50: 0.03, 85: 0.02, 100: 0.02, 110: 0.02, 150: 0.008, 160: 0.008, 200: 0.007,
};

interface CalcLine {
  product: Product | null;
  label: string;
  qty: number;
  sum: number;
}

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selector.component.html',
  styleUrl: './selector.component.scss',
})
export class SelectorComponent {
  readonly store = inject(DataStore);
  readonly quote = inject(QuoteService);

  readonly fittingCats = FITTING_CATS;

  readonly tab = signal<'select' | 'calc'>('select');

  // ── Общие параметры ────────────────────────────────────────────────
  readonly usage = signal<Usage>('internal');
  readonly dia = signal<number | null>(null);

  /** Диаметры труб, доступные для выбранного назначения. */
  readonly diameters = computed(() => {
    const u = this.usage();
    const set = new Set<number>();
    for (const p of this.store.products()) {
      if (p.category === 'pipe' && p.usage === u) set.add(p.diameter);
    }
    return [...set].sort((a, b) => a - b);
  });

  // ── Подборщик ──────────────────────────────────────────────────────
  readonly pipes = computed(() => {
    const u = this.usage();
    const d = this.dia();
    if (d == null) return [];
    return this.store
      .products()
      .filter((p) => p.category === 'pipe' && p.usage === u && p.diameter === d);
  });

  /** Фитинги, сгруппированные по категориям, для выбранного диаметра. */
  readonly fittingGroups = computed(() => {
    const d = this.dia();
    if (d == null) return [];
    const u = this.usage();
    const all = this.store.products();
    return FITTING_CATS.map((cat) => {
      let items = all.filter((p) => p.category === cat.id && p.diameter === d);
      // если есть варианты по назначению — оставляем подходящие
      const byUsage = items.filter((p) => p.usage === u);
      if (byUsage.length) items = byUsage;
      return { ...cat, items };
    }).filter((g) => g.items.length > 0);
  });

  selectUsage(u: Usage): void {
    this.usage.set(u);
    this.dia.set(null);
  }

  add(p: Product): void {
    this.quote.add(p, 1);
  }

  fmt(n: number): string {
    return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
  }

  // ── Калькулятор ────────────────────────────────────────────────────
  readonly length = signal(10);
  readonly segLen = signal(2);
  readonly bends = signal(2);
  readonly tees = signal(1);
  readonly revisions = signal(1);

  /** Подобрать самый дешёвый товар нужной категории и диаметра. */
  private pick(cat: ProductCategory): Product | null {
    const d = this.dia();
    if (d == null) return null;
    const u = this.usage();
    const all = this.store.products().filter((p) => p.category === cat && p.diameter === d);
    const byUsage = all.filter((p) => p.usage === u);
    const pool = byUsage.length ? byUsage : all;
    if (!pool.length) return null;
    return [...pool].sort((a, b) => (a.priceRetail ?? 1e9) - (b.priceRetail ?? 1e9))[0];
  }

  readonly pieces = computed(() => {
    const seg = Math.max(0.5, this.segLen());
    return Math.max(1, Math.ceil(this.length() / seg));
  });

  /** Минимальный нормативный уклон для выбранного диаметра. */
  readonly slope = computed(() => {
    const d = this.dia();
    if (d == null) return 0.02;
    return SLOPE[d] ?? 0.02;
  });

  /** Перепад высоты на всей трассе, см. */
  readonly drop = computed(() => Math.round(this.length() * this.slope() * 100));

  readonly slopeStr = computed(() =>
    this.slope().toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  );
  readonly cmPerM = computed(() =>
    (this.slope() * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 })
  );

  readonly calcLines = computed<CalcLine[]>(() => {
    const d = this.dia();
    if (d == null) return [];
    const lines: CalcLine[] = [];
    const push = (product: Product | null, label: string, qty: number) => {
      if (qty <= 0) return;
      lines.push({ product, label, qty, sum: (product?.priceRetail ?? 0) * qty });
    };
    push(this.pick('pipe'), `Труба Ø${d}`, this.pieces());
    push(this.pick('bend'), `Отвод Ø${d}`, this.bends());
    push(this.pick('tee'), `Тройник Ø${d}`, this.tees());
    push(this.pick('revision'), `Ревизия Ø${d}`, this.revisions());
    push(this.pick('coupling'), `Муфта Ø${d} (стыки)`, Math.max(0, this.pieces() - 1));
    return lines;
  });

  readonly calcTotal = computed(() => this.calcLines().reduce((s, l) => s + l.sum, 0));

  readonly hasPrices = computed(() => this.calcLines().some((l) => l.sum > 0));

  addAll(): void {
    for (const l of this.calcLines()) {
      if (l.product && l.qty > 0) this.quote.add(l.product, l.qty);
    }
  }
}
