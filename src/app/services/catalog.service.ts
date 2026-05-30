import { Injectable, inject } from '@angular/core';
import { CategoryDef, Product } from '../models/product.model';
import { DataStore } from './data-store.service';

/** Read access to the catalog. Delegates to DataStore so admin edits are
 *  reflected on the public site (per-browser today, global once Firebase is on). */
@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly store = inject(DataStore);

  getCategories(): CategoryDef[] {
    return this.store.categories();
  }

  getProducts(): Product[] {
    return this.store.products();
  }

  /** distinct diameters, ascending — used by the filter UI */
  getDiameters(): number[] {
    return [...new Set(this.store.products().map((p) => p.diameter))].sort((a, b) => a - b);
  }
}
