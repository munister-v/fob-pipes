import { Injectable, signal } from '@angular/core';

/**
 * Scaffold for future multilingual + multi-currency support.
 * The UI is shipped in Russian today, but language and currency live here as
 * reactive state so they can be wired to ngx-translate / Angular i18n and a
 * rates source later without touching components.
 *
 * // TODO: integrate i18n (ru / uk / en) and live currency rates (RUB / UAH / USD)
 */
export type Lang = 'ru' | 'uk' | 'en';
export type Currency = 'RUB' | 'UAH' | 'USD';

@Injectable({ providedIn: 'root' })
export class LocaleService {
  readonly lang = signal<Lang>('ru');
  readonly currency = signal<Currency>('RUB');

  readonly langs: Lang[] = ['ru', 'uk', 'en'];
  readonly currencies: Currency[] = ['RUB', 'UAH', 'USD'];

  setLang(l: Lang): void {
    this.lang.set(l);
  }
  setCurrency(c: Currency): void {
    this.currency.set(c);
  }
}
