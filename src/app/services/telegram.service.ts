import { Injectable } from '@angular/core';
import { QuoteRequest } from '../models/product.model';

const TOKEN_KEY = 'fob-tg-token';
const CHAT_KEY  = 'fob-tg-chat';

/**
 * Уведомления в Telegram через Bot API.
 * Токен и Chat ID хранятся в localStorage — настраиваются из адмінки
 * без перекомпиляции. Значения можно также прошить в src-коде ниже
 * если нужна защита от случайной очистки localStorage.
 */
@Injectable({ providedIn: 'root' })
export class TelegramService {
  private token  = localStorage.getItem(TOKEN_KEY)  ?? '';
  private chatId = localStorage.getItem(CHAT_KEY)   ?? '';

  get configured(): boolean {
    return !!this.token && !!this.chatId;
  }

  /** Вызывается из Settings-адмінки после сохранения */
  applyConfig(token: string, chatId: string): void {
    this.token  = token;
    this.chatId = chatId;
  }

  async sendQuote(q: QuoteRequest & { id: string }): Promise<boolean> {
    if (!this.configured) return false;

    const typeLabel: Record<string, string> = {
      private: 'Частное лицо', shop: 'Магазин',
      construction: 'Строительный объект', other: 'Другое',
    };

    const lines = q.lines
      .map((l, i) =>
        `  ${i + 1}\\. ${this.esc(l.product.title)} \\(${l.product.sku}\\) × ${l.qty} ${l.product.unit ?? 'шт'}`
      )
      .join('\n');

    const sum = q.lines.reduce((s, l) => s + (l.product.priceRetail ?? 0) * l.qty, 0);
    const sumLine = sum > 0
      ? `\n💰 Сумма \\(ориент\\.\\): *${sum.toLocaleString('ru-RU')} руб\\.*`
      : '';

    const text = [
      `🔔 *НОВАЯ ЗАЯВКА ${this.esc(q.id)}*`,
      ``,
      `👤 *${this.esc(q.name || 'Без имени')}*`,
      q.phone ? `📞 ${this.esc(q.phone)}` : null,
      q.city  ? `🏙 ${this.esc(q.city)}`  : null,
      `🏷 ${this.esc(typeLabel[q.clientType] ?? q.clientType)}`,
      q.comment ? `💬 _${this.esc(q.comment)}_` : null,
      ``,
      `📦 *Позиций: ${q.lines.length}*`,
      lines,
      sumLine,
    ].filter((l) => l !== null).join('\n');

    return this.post(text, 'MarkdownV2');
  }

  async sendText(message: string): Promise<boolean> {
    if (!this.configured) return false;
    return this.post(message, 'Markdown');
  }

  private async post(text: string, parse_mode: string): Promise<boolean> {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${this.token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: this.chatId, text, parse_mode }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.warn('[telegram] sendMessage error', err);
      }
      return res.ok;
    } catch (e) {
      console.warn('[telegram] fetch failed', e);
      return false;
    }
  }

  /** Экранирование спецсимволов MarkdownV2 */
  private esc(s: string): string {
    return s.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
  }
}
