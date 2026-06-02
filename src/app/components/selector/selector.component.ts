import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore } from '../../services/data-store.service';
import { QuoteService } from '../../services/quote.service';
import { Product, ProductCategory, Usage } from '../../models/product.model';

/** Нормативные минимальные уклоны самотёчной канализации (СП 30.13330 / СНиП 2.04.01-85). */
const SLOPE: Record<number, number> = {
  32: 0.035, 40: 0.035, 50: 0.03, 85: 0.02, 100: 0.02, 110: 0.02, 150: 0.008, 160: 0.008, 200: 0.007,
};

/** Тип проектируемой системы. */
type SysType = 'internal' | 'riser' | 'external' | 'storm';

interface SysDef {
  id: SysType;
  title: string;
  desc: string;
  usage: Usage;
}

const SYSTEMS: SysDef[] = [
  { id: 'internal', title: 'Внутренняя разводка', desc: 'Поэтажная разводка от сантехприборов к стояку', usage: 'internal' },
  { id: 'riser',    title: 'Канализационный стояк', desc: 'Вертикальный стояк по этажам здания', usage: 'internal' },
  { id: 'external', title: 'Наружная трасса',      desc: 'Самотёчный трубопровод в грунте', usage: 'external' },
  { id: 'storm',    title: 'Ливневая канализация', desc: 'Отвод дождевых и талых стоков', usage: 'external' },
];

/** Сантехприборы: расчётный расход стоков (л/с) и мин. диаметр отвода. */
interface FixtureDef {
  id: string;
  label: string;
  du: number;   // расход стоков, л/с
  dia: number;  // мин. диаметр подводки, мм
}

const FIXTURES: FixtureDef[] = [
  { id: 'toilet',  label: 'Унитаз',                       du: 1.6, dia: 110 },
  { id: 'bath',    label: 'Ванна',                        du: 1.1, dia: 50 },
  { id: 'shower',  label: 'Душ / трап',                   du: 0.6, dia: 50 },
  { id: 'sink',    label: 'Раковина / умывальник',        du: 0.3, dia: 50 },
  { id: 'kitchen', label: 'Кухонная мойка',               du: 0.6, dia: 50 },
  { id: 'washer',  label: 'Стиральная / посудомоечная',   du: 0.6, dia: 50 },
  { id: 'bidet',   label: 'Биде',                         du: 0.3, dia: 50 },
];

interface BomLine {
  label: string;
  product: Product | null;
  dia: number;
  qty: number;
  sum: number;
  note?: string;
}

interface CheckLine {
  label: string;
  value: string;
  status: 'ok' | 'warn' | 'info';
}

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

  readonly systems = SYSTEMS;
  readonly fixtures = FIXTURES;

  readonly tab = signal<'config' | 'calc'>('config');

  // ═══════════════ Конфигуратор системы ═══════════════
  readonly step = signal<1 | 2 | 3>(1);
  readonly sysType = signal<SysType | null>(null);
  readonly material = signal<'any' | 'ПП' | 'ПВХ'>('any');

  // параметры
  readonly fxQty = signal<Record<string, number>>({});
  readonly collectorLen = signal(8);
  readonly floors = signal(5);
  readonly floorH = signal(2.8);
  readonly extDia = signal<number | null>(null);
  readonly extLen = signal(20);
  readonly extTurns = signal(3);
  readonly extTees = signal(2);
  readonly extDepth = signal(1.2);

  readonly sysDef = computed(() => SYSTEMS.find((s) => s.id === this.sysType()) ?? null);

  /** Доступные диаметры труб для заданного назначения. */
  diametersForUsage(u: Usage): number[] {
    const set = new Set<number>();
    for (const p of this.store.products()) {
      if (p.category === 'pipe' && p.usage === u) set.add(p.diameter);
    }
    return [...set].sort((a, b) => a - b);
  }
  readonly extDiameters = computed(() => {
    const list = this.diametersForUsage('external');
    return list.length ? list : [110, 160, 200];
  });

  // ── навигация мастера ──────────────────────────────────────────────
  setSys(id: SysType): void {
    this.sysType.set(id);
    this.material.set(id === 'external' || id === 'storm' ? 'ПВХ' : 'ПП');
    if ((id === 'external' || id === 'storm') && this.extDia() == null) {
      const ds = this.extDiameters();
      this.extDia.set(ds.includes(110) ? 110 : ds[0]);
    }
    this.step.set(2);
  }
  next(): void { if (this.canProceed()) this.step.set(3); }
  back(): void { this.step.update((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1)); }
  reset(): void {
    this.step.set(1);
    this.sysType.set(null);
    this.fxQty.set({});
  }

  canProceed(): boolean {
    const t = this.sysType();
    if (t === 'internal') return this.totalFixtures() > 0;
    if (t === 'riser') return this.floors() > 0;
    if (t === 'external' || t === 'storm') return this.extDia() != null && this.extLen() > 0;
    return false;
  }

  // ── приборы ─────────────────────────────────────────────────────────
  qtyOf(id: string): number { return this.fxQty()[id] ?? 0; }
  incFixture(id: string, delta: number): void {
    this.fxQty.update((m) => {
      const next = { ...m, [id]: Math.max(0, (m[id] ?? 0) + delta) };
      if (next[id] === 0) delete next[id];
      return next;
    });
  }
  readonly fixtureEntries = computed(() =>
    FIXTURES.map((def) => ({ def, qty: this.fxQty()[def.id] ?? 0 })).filter((e) => e.qty > 0)
  );
  readonly totalFixtures = computed(() => this.fixtureEntries().reduce((s, e) => s + e.qty, 0));
  readonly toiletCount = computed(() =>
    this.fixtureEntries().filter((e) => e.def.id === 'toilet').reduce((s, e) => s + e.qty, 0)
  );
  readonly totalFlow = computed(() => this.fixtureEntries().reduce((s, e) => s + e.def.du * e.qty, 0));

  /** Рекомендуемый диаметр коллектора/стояка по нормативу. */
  readonly recDia = computed(() => {
    if (this.toiletCount() > 0) return 110;          // обслуживает унитаз → Ø110
    if (this.totalFlow() > 3) return 110;
    return 50;
  });
  readonly recReason = computed(() => {
    if (this.toiletCount() > 0) return 'обслуживает унитаз';
    if (this.totalFlow() > 3) return `расход стоков ${this.flowStr()} л/с`;
    return 'без унитаза, малый расход';
  });

  // ── подбор товара ───────────────────────────────────────────────────
  private usageForType(): Usage {
    return this.sysType() === 'external' || this.sysType() === 'storm' ? 'external' : 'internal';
  }
  private pick(cat: ProductCategory, dia: number): Product | null {
    const u = this.usageForType();
    const mat = this.material();
    let pool = this.store.products().filter((p) => p.category === cat && p.diameter === dia);
    const byUsage = pool.filter((p) => p.usage === u);
    if (byUsage.length) pool = byUsage;
    if (mat !== 'any') {
      const byMat = pool.filter((p) => (p.material || '').toLowerCase().includes(mat.toLowerCase()));
      if (byMat.length) pool = byMat;
    }
    if (!pool.length) return null;
    return [...pool].sort((a, b) => (a.priceRetail ?? 1e9) - (b.priceRetail ?? 1e9))[0];
  }

  // ── спецификация (BOM) ──────────────────────────────────────────────
  readonly configBom = computed<BomLine[]>(() => {
    const t = this.sysType();
    if (!t) return [];
    const lines: BomLine[] = [];
    const push = (cat: ProductCategory, dia: number, label: string, qty: number, note?: string) => {
      const q = Math.ceil(qty);
      if (q <= 0) return;
      const product = this.pick(cat, dia);
      lines.push({ label, product, dia, qty: q, sum: (product?.priceRetail ?? 0) * q, note });
    };

    if (t === 'internal') {
      const rec = this.recDia();
      const fx = this.totalFixtures();
      const pipeM = this.collectorLen() + fx * 1.2;
      const pieces = Math.max(1, Math.ceil(pipeM / 2));
      push('pipe', rec, `Труба Ø${rec}`, pieces, `≈ ${this.round(pipeM)} м`);
      push('tee', rec, `Тройник Ø${rec} — врезка приборов`, fx);
      push('bend', rec, `Отвод Ø${rec}`, Math.max(2, fx));
      const reducers = this.fixtureEntries().filter((e) => e.def.dia < rec).reduce((s, e) => s + e.qty, 0);
      push('reducer', rec, `Переход Ø${rec}→Ø50`, reducers, 'стыковка приборов Ø50');
      push('revision', rec, `Ревизия Ø${rec}`, Math.max(1, Math.ceil(this.collectorLen() / 10)));
      push('coupling', rec, `Муфта Ø${rec}`, Math.max(0, pieces - 1));
      push('clamp', rec, `Хомут / крепление Ø${rec}`, Math.max(1, Math.ceil(pipeM / 1.5)));
      push('plug', rec, `Заглушка Ø${rec}`, 1);
    } else if (t === 'riser') {
      const h = this.floors() * this.floorH();
      const pieces = Math.max(1, Math.ceil(h / 2));
      push('pipe', 110, `Труба стояка Ø110`, pieces, `высота ≈ ${this.round(h)} м`);
      push('tee', 110, `Тройник на этаж Ø110`, this.floors());
      push('revision', 110, `Ревизия Ø110`, Math.max(1, Math.ceil(this.floors() / 3)), 'нижний/верхний этаж + через 3');
      push('coupling', 110, `Муфта Ø110`, Math.max(0, pieces - 1));
      push('clamp', 110, `Хомут стояка Ø110`, this.floors() * 2);
    } else {
      const d = this.extDia() ?? 110;
      const len = this.extLen();
      const pieces = Math.max(1, Math.ceil(len / 2));
      push('pipe', d, `Труба Ø${d}`, pieces, `≈ ${this.round(len)} м`);
      push('bend', d, `Отвод Ø${d}`, this.extTurns());
      push('tee', d, `Тройник Ø${d}`, this.extTees());
      push('revision', d, `Ревизия / прочистка Ø${d}`, Math.max(1, Math.ceil(len / 15) + this.extTurns()));
      push('coupling', d, `Муфта Ø${d}`, Math.max(0, pieces - 1));
    }
    return lines;
  });

  readonly configTotal = computed(() => this.configBom().reduce((s, l) => s + l.sum, 0));
  readonly configHasPrices = computed(() => this.configBom().some((l) => l.sum > 0));
  readonly configMatched = computed(() => this.configBom().filter((l) => l.product).length);

  // ── нормативные проверки ────────────────────────────────────────────
  readonly configChecks = computed<CheckLine[]>(() => {
    const t = this.sysType();
    if (!t) return [];
    const out: CheckLine[] = [];
    if (t === 'internal') {
      const rec = this.recDia();
      out.push({ label: `Рекомендуемый Ø коллектора`, value: `Ø${rec} (${this.recReason()})`, status: 'ok' });
      out.push({ label: `Мин. уклон Ø${rec} (СП 30.13330)`, value: `${this.slopeFmt(SLOPE[rec])} · ${this.cmPerMFmt(SLOPE[rec])} см/м`, status: 'info' });
      out.push({ label: `Суммарный расход стоков`, value: `${this.flowStr()} л/с`, status: 'info' });
    } else if (t === 'riser') {
      out.push({ label: `Диаметр стояка`, value: `Ø110 (обслуживает унитазы)`, status: 'ok' });
      out.push({ label: `Высота стояка`, value: `${this.round(this.floors() * this.floorH())} м (${this.floors()} эт.)`, status: 'info' });
      out.push({ label: `Вентиляция стояка`, value: `вывести фановую трубу на кровлю`, status: 'info' });
    } else {
      const d = this.extDia() ?? 110;
      const slope = SLOPE[d] ?? 0.02;
      const drop = Math.round(this.extLen() * slope * 100);
      out.push({ label: `Мин. уклон Ø${d} (СНиП)`, value: `${this.slopeFmt(slope)} · ${this.cmPerMFmt(slope)} см/м`, status: 'info' });
      out.push({ label: `Перепад на ${this.round(this.extLen())} м`, value: `${drop} см`, status: 'info' });
      out.push({
        label: `Глубина заложения`,
        value: this.extDepth() < 0.7 ? `${this.extDepth()} м — выше глубины промерзания!` : `${this.extDepth()} м — ниже промерзания`,
        status: this.extDepth() < 0.7 ? 'warn' : 'ok',
      });
    }
    return out;
  });

  addConfig(): void {
    for (const l of this.configBom()) {
      if (l.product && l.qty > 0) this.quote.add(l.product, l.qty);
    }
  }

  // ═══════════════ Калькулятор (быстрый) ═══════════════
  readonly cUsage = signal<Usage>('internal');
  readonly cDia = signal<number | null>(null);
  readonly length = signal(10);
  readonly segLen = signal(2);
  readonly bends = signal(2);
  readonly tees = signal(1);
  readonly revisions = signal(1);

  readonly calcDiameters = computed(() => this.diametersForUsage(this.cUsage()));

  selectCUsage(u: Usage): void { this.cUsage.set(u); this.cDia.set(null); }

  private pickCalc(cat: ProductCategory): Product | null {
    const d = this.cDia();
    if (d == null) return null;
    const u = this.cUsage();
    const all = this.store.products().filter((p) => p.category === cat && p.diameter === d);
    const byUsage = all.filter((p) => p.usage === u);
    const pool = byUsage.length ? byUsage : all;
    if (!pool.length) return null;
    return [...pool].sort((a, b) => (a.priceRetail ?? 1e9) - (b.priceRetail ?? 1e9))[0];
  }

  readonly pieces = computed(() => Math.max(1, Math.ceil(this.length() / Math.max(0.5, this.segLen()))));
  readonly slope = computed(() => SLOPE[this.cDia() ?? 0] ?? 0.02);
  readonly drop = computed(() => Math.round(this.length() * this.slope() * 100));
  readonly slopeStr = computed(() => this.slopeFmt(this.slope()));
  readonly cmPerM = computed(() => this.cmPerMFmt(this.slope()));

  readonly calcLines = computed<CalcLine[]>(() => {
    const d = this.cDia();
    if (d == null) return [];
    const lines: CalcLine[] = [];
    const push = (product: Product | null, label: string, qty: number) => {
      if (qty <= 0) return;
      lines.push({ product, label, qty, sum: (product?.priceRetail ?? 0) * qty });
    };
    push(this.pickCalc('pipe'), `Труба Ø${d}`, this.pieces());
    push(this.pickCalc('bend'), `Отвод Ø${d}`, this.bends());
    push(this.pickCalc('tee'), `Тройник Ø${d}`, this.tees());
    push(this.pickCalc('revision'), `Ревизия Ø${d}`, this.revisions());
    push(this.pickCalc('coupling'), `Муфта Ø${d} (стыки)`, Math.max(0, this.pieces() - 1));
    return lines;
  });
  readonly calcTotal = computed(() => this.calcLines().reduce((s, l) => s + l.sum, 0));
  readonly hasPrices = computed(() => this.calcLines().some((l) => l.sum > 0));

  addCalc(): void {
    for (const l of this.calcLines()) {
      if (l.product && l.qty > 0) this.quote.add(l.product, l.qty);
    }
  }

  // ═══════════════ форматирование ═══════════════
  fmt(n: number): string { return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }); }
  round(n: number): number { return Math.round(n * 10) / 10; }
  flowStr(): string { return this.totalFlow().toLocaleString('ru-RU', { maximumFractionDigits: 1 }); }
  slopeFmt(v: number): string { return v.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }
  cmPerMFmt(v: number): string { return (v * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 }); }
}
