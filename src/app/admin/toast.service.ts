import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  text: string;
  kind: 'ok' | 'err' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly items = signal<Toast[]>([]);
  private seq = 0;

  show(text: string, kind: Toast['kind'] = 'ok', ms = 2600): void {
    const id = ++this.seq;
    this.items.update((l) => [...l, { id, text, kind }]);
    setTimeout(() => this.dismiss(id), ms);
  }

  ok(text: string): void {
    this.show(text, 'ok');
  }
  err(text: string): void {
    this.show(text, 'err', 3600);
  }
  info(text: string): void {
    this.show(text, 'info');
  }

  dismiss(id: number): void {
    this.items.update((l) => l.filter((t) => t.id !== id));
  }
}
