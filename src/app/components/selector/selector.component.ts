import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore } from '../../services/data-store.service';
import { QuoteService } from '../../services/quote.service';
import { Product, ProductCategory, Usage } from '../../models/product.model';
import { PdfService } from '../../services/pdf.service';

// ── Нормативные уклоны СП 30.13330 / СНиП 2.04.01-85 ────────────────
const SLOPE: Record<number, number> = {
  32: 0.035, 40: 0.035, 50: 0.03, 85: 0.02,
  100: 0.02, 110: 0.02, 150: 0.008, 160: 0.008, 200: 0.007,
};

// ── Эквивалентные длины фасонных частей (м) для Ø110 ─────────────────
// Источник: Лурье М.В. «Гидравлика», СП 40-102-2000.
// Для других диаметров масштабируем ~линейно.
const EQ_LEN_110: Record<string, number> = {
  bend87: 1.5, bend45: 0.8, tee: 2.0, revision: 1.0, coupling: 0.3,
};
function eqLen(key: keyof typeof EQ_LEN_110, dia: number): number {
  return EQ_LEN_110[key] * (dia / 110);
}

// ── Пропускная способность (Маннинг, самотёчная труба, n=0.009) ───────
// Q_design = 0.7 × Q_half-full [л/с]   (запас наполнения 60%)
function designCapacity(dia_mm: number, slope: number): number {
  const n = 0.009;
  const D = dia_mm / 1000;
  const R = D / 4;
  const v = (1 / n) * Math.pow(R, 2 / 3) * Math.sqrt(slope);
  const A = Math.PI * (D / 2) * (D / 2) / 2;
  return A * v * 1000 * 0.7;                  // л/с, проектный
}

// ── Класс жёсткости SN по глубине и нагрузке ─────────────────────────
function snClass(depthM: number, traffic: boolean): string {
  if (depthM < 0.8) return 'SN8 (минимум при малой глубине)';
  if (traffic && depthM < 3) return 'SN8';
  if (depthM < 3) return 'SN4';
  return 'SN2';
}

type SysType = 'internal' | 'riser' | 'external' | 'storm';

interface SysDef { id: SysType; title: string; desc: string; usage: Usage; icon: string; }
const SYSTEMS: SysDef[] = [
  { id: 'internal', title: 'Внутренняя разводка', desc: 'Поэтажная разводка от сантехприборов к стояку', usage: 'internal', icon: '🏠' },
  { id: 'riser',    title: 'Канализационный стояк', desc: 'Вертикальный стояк по этажам здания', usage: 'internal', icon: '🏗️' },
  { id: 'external', title: 'Наружная трасса',      desc: 'Самотёчный трубопровод в грунте', usage: 'external', icon: '🌍' },
  { id: 'storm',    title: 'Ливневая канализация', desc: 'Отвод дождевых и талых стоков', usage: 'external', icon: '🌧️' },
];

interface FixtureDef { id: string; label: string; du: number; dia: number; icon: string; }
const FIXTURES: FixtureDef[] = [
  { id: 'toilet',  label: 'Унитаз',                       du: 1.6, dia: 110, icon: '🚽' },
  { id: 'bath',    label: 'Ванна',                        du: 1.1, dia: 50,  icon: '🛁' },
  { id: 'shower',  label: 'Душ / трап',                   du: 0.6, dia: 50,  icon: '🚿' },
  { id: 'sink',    label: 'Раковина / умывальник',        du: 0.3, dia: 50,  icon: '🚰' },
  { id: 'kitchen', label: 'Кухонная мойка',               du: 0.6, dia: 50,  icon: '🍳' },
  { id: 'washer',  label: 'Стиральная / посудомоечная',   du: 0.6, dia: 50,  icon: '🧺' },
  { id: 'bidet',   label: 'Биде',                         du: 0.3, dia: 50,  icon: '💧' },
];

const TIPS: Record<SysType, string[]> = {
  internal: [
    'Горизонтальные участки укладывать с уклоном 2 см/м (Ø110) или 3 см/м (Ø50).',
    'Хомуты устанавливать не реже чем через 1,5 м — во избежание провисания.',
    'Ревизия обязательна в каждом угловом повороте > 45° и в начале горизонтального участка.',
    'Соединение раструб + уплотнительное кольцо — смазать смазкой перед монтажом.',
    'Не замуровывать в стену без теплоизоляционного кожуха — тепловые расширения до 10 мм/пог. м.',
  ],
  riser: [
    'Стояк Ø110 обслуживает до 5 унитазов одновременно (по нормативу).',
    'Фановая труба выводится выше кровли на 0,5 м (или 3 м при эксплуатируемой кровле).',
    'Хомуты на каждом этаже — обязательно. Жёсткий хомут (неподвижная опора) — у основания.',
    'Ревизия — каждые 2–3 этажа и у основания стояка.',
    'Компенсационный патрубок устанавливается в местах тепловых расширений длинных стояков.',
  ],
  external: [
    'Минимальная глубина заложения в средней полосе — 0,9–1,2 м (ниже промерзания).',
    'Постель под трубу — песчаная подушка 10–15 см, засыпка — 30 см мягкого грунта.',
    'При пересечении с водопроводом — интервал не менее 0,4 м по горизонтали и 0,2 м по вертикали.',
    'Ревизия устанавливается на каждом повороте и через 15 м прямого участка.',
    'Стыки ПВХ труб не требуют сварки — резиновые кольца надёжны при правильной сборке.',
  ],
  storm: [
    'Уклон ливневой сети — 0,004–0,008 для труб Ø150–200 мм.',
    'Пескоуловитель обязателен перед вводом в центральный коллектор.',
    'Для парковок и проезжей части — SN8 обязательно, при глубине <1 м — SN12.',
    'Ревизии и смотровые колодцы — через каждые 20–25 м.',
    'Перед зимой прочищать пескоуловители — иначе замерзание и засор.',
  ],
};

export interface BomLine {
  label: string;
  product: Product | null;
  dia: number;
  qty: number;
  sum: number;
  note?: string;
}

interface CheckLine { label: string; value: string; status: 'ok' | 'warn' | 'info'; }
interface CalcLine  { product: Product | null; label: string; qty: number; sum: number; }

@Component({
  selector: 'app-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './selector.component.html',
  styleUrl:    './selector.component.scss',
})
export class SelectorComponent {
  readonly store = inject(DataStore);
  readonly quote = inject(QuoteService);
  private readonly pdf = inject(PdfService);

  readonly systems  = SYSTEMS;
  readonly fixtures = FIXTURES;
  readonly tips     = TIPS;

  readonly tab = signal<'config' | 'calc'>('config');

  // ═══ конфигуратор ════════════════════════════════════════════════════
  readonly step     = signal<1 | 2 | 3>(1);
  readonly sysType  = signal<SysType | null>(null);
  readonly material = signal<'any' | 'ПП' | 'ПВХ'>('any');
  readonly trafficLoad = signal(false);   // для наружной: наличие наземной нагрузки (авто)

  readonly fxQty        = signal<Record<string, number>>({});
  readonly collectorLen = signal(8);
  readonly floors       = signal(5);
  readonly floorH       = signal(2.8);
  readonly extDia       = signal<number | null>(null);
  readonly extLen       = signal(20);
  readonly extTurns     = signal(3);
  readonly extTees      = signal(2);
  readonly extDepth     = signal(1.2);

  readonly tipsOpen = signal(false);
  readonly generatingPdf = signal(false);

  readonly sysDef = computed(() => SYSTEMS.find((s) => s.id === this.sysType()) ?? null);

  diametersForUsage(u: Usage): number[] {
    const set = new Set<number>();
    for (const p of this.store.products())
      if (p.category === 'pipe' && p.usage === u) set.add(p.diameter);
    return [...set].sort((a, b) => a - b);
  }
  readonly extDiameters = computed(() => {
    const list = this.diametersForUsage('external');
    return list.length ? list : [110, 160, 200];
  });

  setSys(id: SysType): void {
    this.sysType.set(id);
    this.material.set(id === 'external' || id === 'storm' ? 'ПВХ' : 'ПП');
    this.tipsOpen.set(false);
    if ((id === 'external' || id === 'storm') && this.extDia() == null) {
      const ds = this.extDiameters();
      this.extDia.set(ds.includes(110) ? 110 : ds[0]);
    }
    this.step.set(2);
  }
  next():  void { if (this.canProceed()) this.step.set(3); }
  back():  void { this.step.update((s) => (s > 1 ? (s - 1) as 1|2|3 : 1)); }
  reset(): void { this.step.set(1); this.sysType.set(null); this.fxQty.set({}); this.tipsOpen.set(false); }

  canProceed(): boolean {
    const t = this.sysType();
    if (t === 'internal') return this.totalFixtures() > 0;
    if (t === 'riser')    return this.floors() > 0;
    if (t === 'external' || t === 'storm') return this.extDia() != null && this.extLen() > 0;
    return false;
  }

  // ── приборы ───────────────────────────────────────────────────────────
  qtyOf(id: string): number { return this.fxQty()[id] ?? 0; }
  incFixture(id: string, delta: number): void {
    this.fxQty.update((m) => {
      const next = { ...m, [id]: Math.max(0, (m[id] ?? 0) + delta) };
      if (!next[id]) delete next[id];
      return next;
    });
  }
  readonly fixtureEntries = computed(() =>
    FIXTURES.map((def) => ({ def, qty: this.fxQty()[def.id] ?? 0 })).filter((e) => e.qty > 0)
  );
  readonly totalFixtures = computed(() => this.fixtureEntries().reduce((s, e) => s + e.qty, 0));
  readonly toiletCount   = computed(() =>
    this.fixtureEntries().filter((e) => e.def.id === 'toilet').reduce((s, e) => s + e.qty, 0)
  );
  readonly totalFlow = computed(() =>
    this.fixtureEntries().reduce((s, e) => s + e.def.du * e.qty, 0)
  );

  // ── диаметр и гидравлика (внутренняя) ────────────────────────────────
  readonly recDia = computed(() => {
    if (this.toiletCount() > 0) return 110;
    if (this.totalFlow() > 3)   return 110;
    return 50;
  });
  readonly recReason = computed(() => {
    if (this.toiletCount() > 0) return 'обслуживает унитаз';
    if (this.totalFlow() > 3)   return `суммарный расход ${this.flowStr()} л/с`;
    return 'без унитаза, малый расход';
  });
  readonly qDesign = computed(() => designCapacity(this.recDia(), SLOPE[this.recDia()] ?? 0.02));
  readonly loadPct = computed(() => Math.min(100, Math.round((this.totalFlow() / this.qDesign()) * 100)));
  readonly loadStatus = computed<'ok' | 'warn' | 'crit'>(() => {
    const p = this.loadPct();
    if (p < 60) return 'ok';
    if (p < 90) return 'warn';
    return 'crit';
  });
  readonly qDesignExt = computed(() => {
    const d = this.extDia() ?? 110;
    return designCapacity(d, SLOPE[d] ?? 0.02);
  });

  // ── подбор товара ─────────────────────────────────────────────────────
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

  // ── спецификация (BOM) ─────────────────────────────────────────────────
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
      const fx  = this.totalFixtures();
      // Эквивалентные длины: каждый тройник +2м, каждый отвод +1.5м
      const eqLenTotal = fx * eqLen('tee', rec) + Math.max(2, fx) * eqLen('bend87', rec);
      const rawM   = this.collectorLen() + fx * 1.2 + eqLenTotal * 0.3; // 30% от экв. длин → запас трубы
      const pieces = Math.max(1, Math.ceil(rawM / 2));
      push('pipe',     rec, `Труба Ø${rec}`,                  pieces,   `≈ ${this.round(rawM)} м (с учётом экв. длин)`);
      push('tee',      rec, `Тройник Ø${rec} — врезка приборов`, fx);
      push('bend',     rec, `Отвод Ø${rec}`,                  Math.max(2, fx));
      const reducers = this.fixtureEntries().filter((e) => e.def.dia < rec).reduce((s, e) => s + e.qty, 0);
      push('reducer',  rec, `Переход Ø${rec}→Ø50`,            reducers, 'стыковка приборов Ø50');
      // Ветки Ø50 к приборам (кроме унитазов)
      const branchFx = this.fixtureEntries().filter((e) => e.def.dia === 50).reduce((s, e) => s + e.qty, 0);
      if (branchFx > 0) {
        const branch50m = branchFx * 1.5;
        push('pipe', 50, `Труба Ø50 (ветки к приборам)`, Math.ceil(branch50m / 2), `≈ ${this.round(branch50m)} м`);
        push('coupling', 50, `Муфта Ø50`, Math.max(0, Math.ceil(branch50m / 2) - 1));
      }
      push('revision', rec, `Ревизия Ø${rec}`,                Math.max(1, Math.ceil(this.collectorLen() / 10)));
      push('coupling', rec, `Муфта Ø${rec}`,                  Math.max(0, pieces - 1));
      push('clamp',    rec, `Хомут / крепление Ø${rec}`,      Math.max(1, Math.ceil(rawM / 1.5)));
      push('plug',     rec, `Заглушка Ø${rec}`,               1);

    } else if (t === 'riser') {
      const h      = this.floors() * this.floorH();
      const pieces = Math.max(1, Math.ceil(h / 2));
      push('pipe',     110, `Труба стояка Ø110`,              pieces, `высота ≈ ${this.round(h)} м`);
      push('tee',      110, `Тройник на этаж Ø110`,           this.floors());
      push('revision', 110, `Ревизия Ø110`,                   Math.max(1, Math.ceil(this.floors() / 3)), 'нижний/верхний этаж + через 3');
      push('coupling', 110, `Муфта-компенсатор Ø110`,         Math.max(1, Math.ceil(this.floors() / 3)), 'тепловые расширения');
      push('coupling', 110, `Муфта Ø110`,                     Math.max(0, pieces - 1 - Math.ceil(this.floors() / 3)));
      push('clamp',    110, `Хомут стояка Ø110`,              this.floors() * 2);

    } else {
      const d      = this.extDia() ?? 110;
      const len    = this.extLen();
      // Эквивалентные длины поворотов
      const eqExtra = this.extTurns() * eqLen('bend87', d) * 0.4 + this.extTees() * eqLen('tee', d) * 0.4;
      const totalM  = len + eqExtra;
      const pieces  = Math.max(1, Math.ceil(totalM / 2));
      push('pipe',     d, `Труба Ø${d}`,                      pieces, `≈ ${this.round(totalM)} м (с запасом)`);
      push('bend',     d, `Отвод Ø${d}`,                      this.extTurns());
      push('tee',      d, `Тройник Ø${d}`,                    this.extTees());
      push('revision', d, `Ревизия / прочистка Ø${d}`,        Math.max(1, Math.ceil(len / 15) + this.extTurns()));
      push('coupling', d, `Муфта Ø${d}`,                      Math.max(0, pieces - 1));
    }
    return lines;
  });

  readonly configTotal     = computed(() => this.configBom().reduce((s, l) => s + l.sum, 0));
  readonly configHasPrices = computed(() => this.configBom().some((l) => l.sum > 0));
  readonly configMatched   = computed(() => this.configBom().filter((l) => l.product).length);

  // ── нормативные проверки ──────────────────────────────────────────────
  readonly configChecks = computed<CheckLine[]>(() => {
    const t = this.sysType();
    if (!t) return [];
    const out: CheckLine[] = [];

    if (t === 'internal') {
      const rec = this.recDia();
      const sl  = SLOPE[rec] ?? 0.02;
      out.push({ label: `Рекомендуемый Ø коллектора`, value: `Ø${rec} (${this.recReason()})`, status: 'ok' });
      out.push({ label: `Мин. уклон (СП 30.13330)`, value: `${this.slopeFmt(sl)} · ${this.cmPerMFmt(sl)} см/м`, status: 'info' });
      out.push({
        label: `Гидравлическая нагрузка`,
        value: `${this.flowStr()} из ${this.fmtQ(this.qDesign())} л/с (${this.loadPct()}%)`,
        status: this.loadStatus() === 'ok' ? 'ok' : this.loadStatus() === 'warn' ? 'warn' : 'warn',
      });
      out.push({ label: `Суммарный расход стоков`, value: `${this.flowStr()} л/с (${this.totalFixtures()} приборов)`, status: 'info' });
    } else if (t === 'riser') {
      out.push({ label: `Диаметр стояка`, value: `Ø110 (по СП 30.13330)`, status: 'ok' });
      out.push({ label: `Высота стояка`, value: `${this.round(this.floors() * this.floorH())} м (${this.floors()} эт.)`, status: 'info' });
      out.push({ label: `Фановая труба`, value: `вывести Ø110 выше кровли на 0,5 м`, status: 'info' });
      out.push({ label: `Пропускная способность Ø110`, value: `до ${this.fmtQ(designCapacity(110, 0.02))} л/с`, status: 'info' });
    } else {
      const d     = this.extDia() ?? 110;
      const slope = SLOPE[d] ?? 0.02;
      const drop  = Math.round(this.extLen() * slope * 100);
      out.push({ label: `Мин. уклон (СНиП)`, value: `${this.slopeFmt(slope)} · ${this.cmPerMFmt(slope)} см/м`, status: 'info' });
      out.push({ label: `Перепад на ${this.round(this.extLen())} м`, value: `${drop} см`, status: 'info' });
      out.push({
        label: `Глубина заложения`,
        value: this.extDepth() < 0.7
          ? `${this.extDepth()} м — выше глубины промерзания!`
          : `${this.extDepth()} м — в норме`,
        status: this.extDepth() < 0.7 ? 'warn' : 'ok',
      });
      out.push({
        label: `Рекомендуемый класс жёсткости`,
        value: snClass(this.extDepth(), this.trafficLoad()),
        status: 'info',
      });
      out.push({ label: `Пропускная способность Ø${d}`, value: `до ${this.fmtQ(this.qDesignExt())} л/с`, status: 'info' });
    }
    return out;
  });

  readonly currentTips = computed<string[]>(() => TIPS[this.sysType() ?? 'internal']);

  addConfig(): void {
    for (const l of this.configBom())
      if (l.product && l.qty > 0) this.quote.add(l.product, l.qty);
  }
  addLine(l: BomLine): void {
    if (l.product) this.quote.add(l.product, l.qty);
  }

  async downloadSpec(): Promise<void> {
    const t = this.sysType();
    if (!t) return;
    this.generatingPdf.set(true);
    try {
      const bom     = this.configBom();
      const checks  = this.configChecks();
      const content = this.store.content();
      const sys     = this.sysDef()!;
      await this.pdf.spec(sys.title, bom, checks, content);
    } finally {
      this.generatingPdf.set(false);
    }
  }

  // ═══ Быстрый калькулятор ═════════════════════════════════════════════
  readonly cUsage   = signal<Usage>('internal');
  readonly cDia     = signal<number | null>(null);
  readonly length   = signal(10);
  readonly segLen   = signal(2);
  readonly bends    = signal(2);
  readonly tees     = signal(1);
  readonly revisions = signal(1);

  readonly calcDiameters = computed(() => this.diametersForUsage(this.cUsage()));
  selectCUsage(u: Usage): void { this.cUsage.set(u); this.cDia.set(null); }

  private pickCalc(cat: ProductCategory): Product | null {
    const d = this.cDia();
    if (d == null) return null;
    const u   = this.cUsage();
    const all = this.store.products().filter((p) => p.category === cat && p.diameter === d);
    const by  = all.filter((p) => p.usage === u);
    const pool = by.length ? by : all;
    if (!pool.length) return null;
    return [...pool].sort((a, b) => (a.priceRetail ?? 1e9) - (b.priceRetail ?? 1e9))[0];
  }

  readonly pieces    = computed(() => Math.max(1, Math.ceil(this.length() / Math.max(0.5, this.segLen()))));
  readonly slope     = computed(() => SLOPE[this.cDia() ?? 0] ?? 0.02);
  readonly drop      = computed(() => Math.round(this.length() * this.slope() * 100));
  readonly slopeStr  = computed(() => this.slopeFmt(this.slope()));
  readonly cmPerM    = computed(() => this.cmPerMFmt(this.slope()));
  readonly qCap      = computed(() => designCapacity(this.cDia() ?? 110, this.slope()));

  readonly calcLines = computed<CalcLine[]>(() => {
    const d = this.cDia();
    if (d == null) return [];
    const lines: CalcLine[] = [];
    const push = (product: Product | null, label: string, qty: number) => {
      if (qty <= 0) return;
      lines.push({ product, label, qty, sum: (product?.priceRetail ?? 0) * qty });
    };
    push(this.pickCalc('pipe'),     `Труба Ø${d}`,          this.pieces());
    push(this.pickCalc('bend'),     `Отвод Ø${d}`,          this.bends());
    push(this.pickCalc('tee'),      `Тройник Ø${d}`,        this.tees());
    push(this.pickCalc('revision'), `Ревизия Ø${d}`,        this.revisions());
    push(this.pickCalc('coupling'), `Муфта Ø${d} (стыки)`,  Math.max(0, this.pieces() - 1));
    return lines;
  });
  readonly calcTotal  = computed(() => this.calcLines().reduce((s, l) => s + l.sum, 0));
  readonly hasPrices  = computed(() => this.calcLines().some((l) => l.sum > 0));

  addCalc(): void {
    for (const l of this.calcLines())
      if (l.product && l.qty > 0) this.quote.add(l.product, l.qty);
  }

  // ═══ форматирование ══════════════════════════════════════════════════
  fmt(n: number): string    { return n.toLocaleString('ru-RU', { maximumFractionDigits: 0 }); }
  round(n: number): number  { return Math.round(n * 10) / 10; }
  flowStr(): string         { return this.totalFlow().toLocaleString('ru-RU', { maximumFractionDigits: 1 }); }
  fmtQ(v: number): string   { return v.toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
  slopeFmt(v: number): string   { return v.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 }); }
  cmPerMFmt(v: number): string  { return (v * 100).toLocaleString('ru-RU', { maximumFractionDigits: 1 }); }
}
