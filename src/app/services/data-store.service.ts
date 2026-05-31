import { Injectable, effect, inject, signal } from '@angular/core';
import { CATEGORIES, PRODUCTS } from '../data/catalog.data';
import { CategoryDef, Product, QuoteRequest } from '../models/product.model';
import { FirebaseService } from './firebase.service';

export type QuoteStatus = 'new' | 'in_progress' | 'done';

export interface StoredQuote extends QuoteRequest {
  id: string;
  createdAt: number;
  status: QuoteStatus;
  /** internal manager note, not shown to the client */
  note?: string;
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
 *
 * Two interchangeable backends, chosen automatically:
 *  • Firebase Firestore — when firebase.config.ts is filled in. Catalog/content
 *    edits and incoming quotes are GLOBAL and realtime across all devices.
 *  • localStorage — otherwise. Per-browser, zero setup (default today).
 *
 * Consumers only touch the signals + mutator methods; the backend is invisible.
 */
@Injectable({ providedIn: 'root' })
export class DataStore {
  private readonly firebase = inject(FirebaseService);
  private readonly KEY = 'fob-store-v1';
  private readonly fb = this.firebase.enabled();

  readonly products = signal<Product[]>(structuredClone(PRODUCTS));
  readonly categories = signal<CategoryDef[]>(structuredClone(CATEGORIES));
  readonly quotes = signal<StoredQuote[]>([]);
  readonly content = signal<SiteContent>({ ...DEFAULT_CONTENT });

  private ready = false;
  private quotesUnsub: (() => void) | null = null;

  constructor() {
    if (this.fb) {
      void this.initFirebase();
    } else {
      this.load();
      this.ready = true;
      effect(() => {
        const snap: Persisted = {
          products: this.products(),
          categories: this.categories(),
          quotes: this.quotes(),
          content: this.content(),
        };
        if (this.ready) this.persist(snap);
      });
    }
  }

  // ═══════════════ localStorage backend ═══════════════
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

  // ═══════════════ Firestore backend ═══════════════
  private async initFirebase(): Promise<void> {
    try {
      const { db, fs } = await this.firebase.handle();

      // Seed the catalog/categories/content docs on first ever run.
      const catRef = fs.doc(db, 'site', 'catalog');
      const existing = await fs.getDoc(catRef);
      if (!existing.exists()) {
        try {
          await fs.setDoc(catRef, { products: this.products() });
          await fs.setDoc(fs.doc(db, 'site', 'categories'), { items: this.categories() });
          await fs.setDoc(fs.doc(db, 'site', 'content'), this.content());
        } catch (e) {
          console.warn('[firebase] seed skipped until admin signs in', e);
        }
      }

      // Realtime mirrors → signals.
      fs.onSnapshot(fs.doc(db, 'site', 'catalog'), (d: { data: () => { products?: Product[] } }) => {
        const x = d.data();
        if (x?.products) this.products.set(x.products);
      });
      fs.onSnapshot(
        fs.doc(db, 'site', 'categories'),
        (d: { data: () => { items?: CategoryDef[] } }) => {
          const x = d.data();
          if (x?.items) this.categories.set(x.items);
        }
      );
      fs.onSnapshot(fs.doc(db, 'site', 'content'), (d: { data: () => Partial<SiteContent> }) => {
        const x = d.data();
        if (x) this.content.set({ ...DEFAULT_CONTENT, ...x });
      });
      const authMod = await import('firebase/auth');
      authMod.onAuthStateChanged(authMod.getAuth(), (user) => {
        this.quotesUnsub?.();
        this.quotesUnsub = null;

        if (!user) {
          this.quotes.set([]);
          return;
        }

        this.quotesUnsub = fs.onSnapshot(
          fs.query(fs.collection(db, 'quotes'), fs.orderBy('createdAt', 'desc')),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (qs: { docs: any[] }) => {
            this.quotes.set(qs.docs.map((doc) => ({ ...doc.data(), id: doc.id }) as StoredQuote));
          },
          (e: unknown) => console.error('[firebase] quotes subscription failed', e)
        );
      });
    } catch (e) {
      console.error('[firebase] init failed, falling back to local snapshot', e);
    }
  }

  private async writeDoc(path: [string, string], data: unknown): Promise<void> {
    if (!this.fb) return;
    try {
      const { db, fs } = await this.firebase.handle();
      await fs.setDoc(fs.doc(db, path[0], path[1]), data);
    } catch (e) {
      console.error('[firebase] write failed', e);
    }
  }

  // ═══════════════ products ═══════════════
  upsertProduct(p: Product): void {
    this.products.update((list) => {
      const i = list.findIndex((x) => x.sku === p.sku);
      if (i === -1) return [...list, p];
      const copy = [...list];
      copy[i] = p;
      return copy;
    });
    void this.writeDoc(['site', 'catalog'], { products: this.products() });
  }

  deleteProduct(sku: string): void {
    this.products.update((list) => list.filter((p) => p.sku !== sku));
    void this.writeDoc(['site', 'catalog'], { products: this.products() });
  }

  // ═══════════════ categories ═══════════════
  updateCategory(c: CategoryDef): void {
    this.categories.update((list) => list.map((x) => (x.id === c.id ? c : x)));
    void this.writeDoc(['site', 'categories'], { items: this.categories() });
  }

  addCategory(c: CategoryDef): void {
    this.categories.update((list) =>
      list.some((x) => x.id === c.id) ? list : [...list, c]
    );
    void this.writeDoc(['site', 'categories'], { items: this.categories() });
  }

  deleteCategory(id: string): void {
    this.categories.update((list) => list.filter((c) => c.id !== id));
    void this.writeDoc(['site', 'categories'], { items: this.categories() });
  }

  // ═══════════════ quotes ═══════════════
  addQuote(req: QuoteRequest): StoredQuote {
    const q: StoredQuote = {
      ...req,
      id: 'Q-' + Date.now().toString(36).toUpperCase(),
      createdAt: Date.now(),
      status: 'new',
    };
    if (this.fb) {
      // Firestore assigns the id; the snapshot listener brings it back.
      void this.addQuoteRemote(q);
    } else {
      this.quotes.update((list) => [q, ...list]);
    }
    return q;
  }

  private async addQuoteRemote(q: StoredQuote): Promise<void> {
    try {
      const { db, fs } = await this.firebase.handle();
      const { id: _omit, ...payload } = q;
      void _omit;
      await fs.addDoc(fs.collection(db, 'quotes'), payload);
    } catch (e) {
      console.error('[firebase] addQuote failed', e);
    }
  }

  setQuoteStatus(id: string, status: QuoteStatus): void {
    this.quotes.update((list) => list.map((q) => (q.id === id ? { ...q, status } : q)));
    if (this.fb) this.updateQuoteRemote(id, { status });
  }

  setQuoteNote(id: string, note: string): void {
    this.quotes.update((list) => list.map((q) => (q.id === id ? { ...q, note } : q)));
    if (this.fb) this.updateQuoteRemote(id, { note });
  }

  deleteQuote(id: string): void {
    this.quotes.update((list) => list.filter((q) => q.id !== id));
    if (this.fb) this.deleteQuoteRemote(id);
  }

  private async updateQuoteRemote(id: string, patch: Partial<StoredQuote>): Promise<void> {
    try {
      const { db, fs } = await this.firebase.handle();
      await fs.updateDoc(fs.doc(db, 'quotes', id), patch);
    } catch (e) {
      console.error('[firebase] updateQuote failed', e);
    }
  }

  private async deleteQuoteRemote(id: string): Promise<void> {
    try {
      const { db, fs } = await this.firebase.handle();
      await fs.deleteDoc(fs.doc(db, 'quotes', id));
    } catch (e) {
      console.error('[firebase] deleteQuote failed', e);
    }
  }

  // ═══════════════ content ═══════════════
  updateContent(patch: Partial<SiteContent>): void {
    this.content.update((c) => ({ ...c, ...patch }));
    void this.writeDoc(['site', 'content'], this.content());
  }

  // ═══════════════ maintenance / backup ═══════════════
  resetCatalog(): void {
    this.products.set(structuredClone(PRODUCTS));
    this.categories.set(structuredClone(CATEGORIES));
    void this.writeDoc(['site', 'catalog'], { products: this.products() });
    void this.writeDoc(['site', 'categories'], { items: this.categories() });
  }

  /** Whole-store snapshot for a backup file. */
  snapshot(): Persisted {
    return {
      products: this.products(),
      categories: this.categories(),
      quotes: this.quotes(),
      content: this.content(),
    };
  }

  /** Restore from a backup file. Catalog/categories/content always; quotes optional. */
  importAll(data: Partial<Persisted>, opts: { withQuotes?: boolean } = {}): void {
    if (data.products?.length) this.products.set(data.products);
    if (data.categories?.length) this.categories.set(data.categories);
    if (data.content) this.content.set({ ...DEFAULT_CONTENT, ...data.content });
    if (opts.withQuotes && data.quotes) this.quotes.set(data.quotes);
    void this.writeDoc(['site', 'catalog'], { products: this.products() });
    void this.writeDoc(['site', 'categories'], { items: this.categories() });
    void this.writeDoc(['site', 'content'], this.content());
  }

  /** Backend label for the UI. */
  backend(): 'firebase' | 'local' {
    return this.fb ? 'firebase' : 'local';
  }
}
