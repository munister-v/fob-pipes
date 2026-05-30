import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CLIENT_TYPES, QuoteService } from '../../services/quote.service';
import { CatalogService } from '../../services/catalog.service';
import { ClientType, Product, ProductCategory } from '../../models/product.model';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-quote',
  standalone: true,
  imports: [CommonModule, FormsModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quote.component.html',
  styleUrl: './quote.component.scss',
})
export class QuoteComponent {
  readonly quote = inject(QuoteService);
  private readonly catalog = inject(CatalogService);
  readonly clientTypes = CLIENT_TYPES;

  readonly categories = this.catalog.getCategories();
  private readonly products = this.catalog.getProducts();
  private readonly catImg = new Map(this.categories.map((c) => [c.id, c.img]));

  // browser state
  readonly browseCat = signal<ProductCategory | 'all'>('all');
  readonly search = signal('');

  readonly browsed = computed(() => {
    const cat = this.browseCat();
    const q = this.search().trim().toLowerCase();
    return this.products.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (q && !(p.title.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.spec.toLowerCase().includes(q))) return false;
      return true;
    });
  });

  readonly catCount = computed(() => new Set(this.quote.lines().map((l) => l.product.category)).size);

  thumbFor(p: Product): string {
    return this.catImg.get(p.category) ?? 'assets/img/prod-1.jpg';
  }

  // form state
  name = '';
  phone = '';
  city = '';
  comment = '';
  clientType: ClientType = 'private';

  readonly submitted = signal(false);
  readonly sending = signal(false);
  readonly contactsOpen = signal(false);

  qtyOf(sku: string): number {
    return this.quote.lines().find((l) => l.product.sku === sku)?.qty ?? 0;
  }

  inc(p: Product): void {
    const q = this.qtyOf(p.sku);
    if (q === 0) this.quote.add(p, 1);
    else this.quote.setQty(p.sku, q + 1);
  }
  dec(p: Product): void {
    const q = this.qtyOf(p.sku);
    if (q > 0) this.quote.setQty(p.sku, q - 1);
  }
  remove(sku: string): void {
    this.quote.remove(sku);
  }
  setQty(sku: string, value: number | string): void {
    this.quote.setQty(sku, +value);
  }

  setCat(c: ProductCategory | 'all'): void {
    this.browseCat.set(c);
  }

  toggleContacts(): void {
    this.contactsOpen.update((v) => !v);
  }

  trackBySku(_: number, l: { product: { sku: string } }): string { return l.product.sku; }
  trackByProdSku(_: number, p: { sku: string }): string { return p.sku; }
  trackByCatId(_: number, c: { id: string }): string { return c.id; }
  trackByClientId(_: number, t: { id: string }): string { return t.id; }

  get canSubmit(): boolean {
    return (
      this.quote.count() > 0 &&
      this.name.trim().length > 1 &&
      this.phone.trim().length > 4
    );
  }

  async send(): Promise<void> {
    if (!this.canSubmit || this.sending()) return;
    this.sending.set(true);

    await this.quote.submit({
      name: this.name.trim(),
      phone: this.phone.trim(),
      city: this.city.trim(),
      comment: this.comment.trim(),
      clientType: this.clientType,
    });

    this.sending.set(false);
    this.submitted.set(true);
  }

  reset(): void {
    this.quote.clear();
    this.name = this.phone = this.city = this.comment = '';
    this.clientType = 'private';
    this.submitted.set(false);
    this.contactsOpen.set(false);
  }
}
