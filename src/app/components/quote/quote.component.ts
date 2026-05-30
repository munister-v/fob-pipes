import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CLIENT_TYPES, QuoteService } from '../../services/quote.service';
import { ClientType } from '../../models/product.model';
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
  readonly clientTypes = CLIENT_TYPES;

  // form model
  name = '';
  phone = '';
  city = '';
  comment = '';
  clientType: ClientType = 'private';

  readonly submitted = signal(false);
  readonly sending = signal(false);

  inc(sku: string, current: number): void { this.quote.setQty(sku, current + 1); }
  dec(sku: string, current: number): void { this.quote.setQty(sku, current - 1); }
  remove(sku: string): void { this.quote.remove(sku); }

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

    // TODO: send quote to backend -> Telegram bot + email duplicate + optional 1C export
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
  }
}
