import { Injectable } from '@angular/core';
import { CATEGORIES, PRODUCTS } from '../data/catalog.data';
import { CategoryDef, Product } from '../models/product.model';

/** Read-only access to the catalog. Today it serves mock data; tomorrow it
 *  can fetch from a backend without changing component code. */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  getCategories(): CategoryDef[] {
    return CATEGORIES;
  }

  getProducts(): Product[] {
    return PRODUCTS;
  }

  /** distinct diameters, ascending — used by the filter UI */
  getDiameters(): number[] {
    return [...new Set(PRODUCTS.map((p) => p.diameter))].sort((a, b) => a - b);
  }
}
