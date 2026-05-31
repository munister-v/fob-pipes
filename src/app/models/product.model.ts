/** Domain model for the catalog. Designed to map cleanly onto a future
 *  backend / 1C export, so field names stay stable and explicit. */

export type ProductCategory = 'pipe' | 'bend' | 'coupling' | 'tee' | 'revision' | 'reducer';

/** Назначение — внутренняя / наружная канализация */
export type Usage = 'internal' | 'external';

/** Availability status — there is no online stock, everything is confirmed by hand. */
export type Availability = 'check' | 'order';

export type PriceUnit = 'шт' | 'м.п.' | 'кг' | 'компл.';

export interface Product {
  /** stable SKU, ready for 1C / backend mapping */
  sku: string;
  title: string;
  category: ProductCategory;
  usage: Usage;
  /** nominal diameter in mm */
  diameter: number;
  /** short spec line shown on the card */
  spec: string;
  availability: Availability;
  /** decorative material tag */
  material: string;
  /** prices — optional, shown only to admin or when publicPrices enabled */
  priceRetail?: number;
  priceWholesale?: number;
  /** minimum wholesale qty */
  wholesaleFrom?: number;
  unit?: PriceUnit;
  /** 1С external key for future integration */
  sku1c?: string;
}

export interface CategoryDef {
  id: ProductCategory;
  title: string;
  /** two-digit index marker, Q-Industrial style */
  index: string;
  blurb: string;
  /** product photo for the category card */
  img: string;
}

/** A line in the «собрать заявку» request (instead of a cart). */
export interface QuoteLine {
  product: Product;
  qty: number;
}

export type ClientType = 'private' | 'shop' | 'construction' | 'other';

export interface QuoteRequest {
  lines: QuoteLine[];
  name: string;
  phone: string;
  city: string;
  comment: string;
  clientType: ClientType;
}
