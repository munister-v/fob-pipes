import { Injectable, computed, signal } from '@angular/core';
import { ClientType, Product, QuoteLine, QuoteRequest } from '../models/product.model';

/** «Собрать заявку» — a quote builder that replaces a shopping cart.
 *  No prices, no payment: the request is assembled and then confirmed by hand. */
@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly _lines = signal<QuoteLine[]>([]);

  /** reactive snapshot of the current request lines */
  readonly lines = this._lines.asReadonly();

  /** total number of distinct positions */
  readonly count = computed(() => this._lines().length);

  /** total quantity across all positions */
  readonly totalQty = computed(() =>
    this._lines().reduce((sum, l) => sum + l.qty, 0)
  );

  add(product: Product, qty = 1): void {
    this._lines.update((lines) => {
      const existing = lines.find((l) => l.product.sku === product.sku);
      if (existing) {
        return lines.map((l) =>
          l.product.sku === product.sku ? { ...l, qty: l.qty + qty } : l
        );
      }
      return [...lines, { product, qty }];
    });
  }

  setQty(sku: string, qty: number): void {
    if (qty <= 0) return this.remove(sku);
    this._lines.update((lines) =>
      lines.map((l) => (l.product.sku === sku ? { ...l, qty } : l))
    );
  }

  remove(sku: string): void {
    this._lines.update((lines) => lines.filter((l) => l.product.sku !== sku));
  }

  has(sku: string): boolean {
    return this._lines().some((l) => l.product.sku === sku);
  }

  clear(): void {
    this._lines.set([]);
  }

  /** Assemble the final payload. */
  buildRequest(meta: Omit<QuoteRequest, 'lines'>): QuoteRequest {
    return { lines: this._lines(), ...meta };
  }

  /**
   * Submit the assembled quote.
   * Today it only resolves locally (no backend in this build).
   *
   * // TODO: send quote to backend -> Telegram bot + email duplicate + optional 1C export
   */
  async submit(meta: Omit<QuoteRequest, 'lines'>): Promise<QuoteRequest> {
    const request = this.buildRequest(meta);
    // TODO: send quote to backend -> Telegram bot + email duplicate + optional 1C export
    console.info('[quote] assembled request (mock):', request);
    return request;
  }
}

export const CLIENT_TYPES: { id: ClientType; label: string }[] = [
  { id: 'private', label: 'Частный' },
  { id: 'shop', label: 'Магазин' },
  { id: 'construction', label: 'Строительный объект' },
  { id: 'other', label: 'Другое' },
];
