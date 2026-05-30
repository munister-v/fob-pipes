import { Injectable, effect, signal } from '@angular/core';
import { CATEGORIES, PRODUCTS } from '../data/catalog.data';
import { CategoryDef, Product, QuoteRequest } from '../models/product.model';

export type QuoteStatus = 'new' | 'in_progress' | 'done';

export interface StoredQuote extends QuoteRequest {
  id: string;
  createdAt: number;
  status: QuoteStatus;
}

export interface SiteContent {
  aboutLead: string;
  aboutBody: string;
  phone: string;
  viber: string;
  email: string;
  address: string;
  hours: string;
}

const DEFAULT_CONTENT: SiteContent = {
  aboutLead:
    'Компания основана в 1998 году под маркой «ЮНИПЛАСТ». Сегодня выпускаем продукцию под марками «Юнипласт» и «Ф.О.Б» — одно из первых и крупнейших производств пластиковой канализации.',
  aboutBody:
    'На заводе установлено современное европейское оборудование: 5 экструзионных линий и 9 термопластавтоматов. Свыше 200 видов продукции. Постоянный участник выставки Aqua-Therm.',
  phone: '+7 (949) 306-35-22',
  viber: '+7 (949) 624-99-80',
  email: 'FOBDonetsk@gmail.com',
  address: 'г. Донецк, ул. Калинина, 102',
  hours: 'Пн–Пт · 08:00–17:00',
};

interface Persisted {
  products: Product[];
  categories: CategoryDef[];
  quotes: StoredQuote[];
  content: SiteContent;
}

/**
 * Single reactive source of truth for catalog, quotes and editable content.
 * Backed by localStorage today; the same signal API can be fed by Firebase
 * later without touching consumers — just swap load()/persist() internals.
 */
@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly KEY = 'fob-store-v1';

  readonly products = signal<Product[]>(structuredClone(PRODUCTS));
  readonly categories = signal<CategoryDef[]>(structuredClone(CATEGORIES));
  readonly quotes = signal<StoredQuote[]>([]);
  readonly content = signal<SiteContent>({ ...DEFAULT_CONTENT });

  private ready = false;

  constructor() {
    this.load();
    this.ready = true;
    effect(() => {
      // touch every slice so persistence runs on any mutation
      const snap: Persisted = {
        products: this.products(),
        categories: this.categories(),
        quotes: this.quotes(),
        content: this.content(),
      };
      if (this.ready) this.persist(snap);
    });
  }

  // ── persistence ──────────────────────────────────────────────
  private load(): void {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Partial<Persisted>;
      if (data.products?.length) this.products.set(data.products);
      if (data.categories?.length) this.categories.set(data.categories);
      if (data.quotes) this.quotes.set(data.quotes);
      if (data.content) this.content.set({ ...DEFAULT_CONTENT, ...data.content });
    } catch {
      /* ignore corrupt storage */
    }
  }

  private persist(snap: Persisted): void {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(snap));
    } catch {
      /* quota / private mode — non-fatal */
    }
  }

  // ── products ─────────────────────────────────────────────────
  upsertProduct(p: Product): void {
    this.products.update((list) => {
      const i = list.findIndex((x) => x.sku === p.sku);
      if (i === -1) return [...list, p];
      const copy = [...list];
      copy[i] = p;
      return copy;
    });
  }

  deleteProduct(sku: string): void {
    this.products.update((list) => list.filter((p) => p.sku !== sku));
  }

  // ── categories ───────────────────────────────────────────────
  updateCategory(c: CategoryDef): void {
    this.categories.update((list) => list.map((x) => (x.id === c.id ? c : x)));
  }

  // ── quotes ───────────────────────────────────────────────────
  addQuote(req: QuoteRequest): StoredQuote {
    const q: StoredQuote = {
      ...req,
      id: 'Q-' + Date.now().toString(36).toUpperCase(),
      createdAt: Date.now(),
      status: 'new',
    };
    this.quotes.update((list) => [q, ...list]);
    return q;
  }

  setQuoteStatus(id: string, status: QuoteStatus): void {
    this.quotes.update((list) => list.map((q) => (q.id === id ? { ...q, status } : q)));
  }

  deleteQuote(id: string): void {
    this.quotes.update((list) => list.filter((q) => q.id !== id));
  }

  // ── content ──────────────────────────────────────────────────
  updateContent(patch: Partial<SiteContent>): void {
    this.content.update((c) => ({ ...c, ...patch }));
  }

  // ── maintenance ──────────────────────────────────────────────
  resetCatalog(): void {
    this.products.set(structuredClone(PRODUCTS));
    this.categories.set(structuredClone(CATEGORIES));
  }
}
