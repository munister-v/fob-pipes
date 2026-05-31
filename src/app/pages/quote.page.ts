import { ChangeDetectionStrategy, Component } from '@angular/core';
import { QuoteComponent } from '../components/quote/quote.component';

@Component({
  selector: 'app-quote-page',
  standalone: true,
  imports: [QuoteComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-quote />`,
})
export class QuotePage {}
