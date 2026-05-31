import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStore, SiteContent } from '../services/data-store.service';
import { CategoryDef } from '../models/product.model';

@Component({
  selector: 'app-content-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Контент</h1>
        <p class="adm-sub">Тексты, контакты и фотографии категорий</p>
      </div>
      <button class="adm-btn adm-btn--accent" (click)="saveContent()" [disabled]="!dirty()">
        {{ saved() ? '✓ Сохранено' : 'Сохранить' }}
      </button>
    </header>

    <div class="adm-grid-cols">
      <section class="adm-card">
        <div class="adm-card__head"><h2>О компании</h2></div>
        <label class="adm-field">
          <span>Вступление</span>
          <textarea rows="3" [(ngModel)]="c.aboutLead" (ngModelChange)="touch()"></textarea>
        </label>
        <label class="adm-field">
          <span>Основной текст</span>
          <textarea rows="4" [(ngModel)]="c.aboutBody" (ngModelChange)="touch()"></textarea>
        </label>
      </section>

      <section class="adm-card">
        <div class="adm-card__head"><h2>Контакты</h2></div>
        <label class="adm-field"><span>Телефон</span>
          <input [(ngModel)]="c.phone" (ngModelChange)="touch()" /></label>
        <label class="adm-field"><span>Viber</span>
          <input [(ngModel)]="c.viber" (ngModelChange)="touch()" /></label>
        <label class="adm-field"><span>E-mail</span>
          <input [(ngModel)]="c.email" (ngModelChange)="touch()" /></label>
        <label class="adm-field"><span>Адрес</span>
          <input [(ngModel)]="c.address" (ngModelChange)="touch()" /></label>
        <label class="adm-field"><span>График</span>
          <input [(ngModel)]="c.hours" (ngModelChange)="touch()" /></label>
      </section>
    </div>

    <section class="adm-card">
      <div class="adm-card__head"><h2>Категории продукции</h2></div>
      <div class="adm-cats">
        <div class="adm-cat" *ngFor="let cat of store.categories()">
          <div class="adm-cat__thumb">
            <img [src]="cat.img" [alt]="cat.title" />
            <label class="adm-cat__upload">
              ↑ Фото
              <input type="file" accept="image/*" hidden (change)="onPhoto($event, cat)" />
            </label>
          </div>
          <label class="adm-field adm-field--sm"><span>Название</span>
            <input [ngModel]="cat.title" (ngModelChange)="patchCat(cat, { title: $event })" /></label>
          <label class="adm-field adm-field--sm"><span>Описание</span>
            <input [ngModel]="cat.blurb" (ngModelChange)="patchCat(cat, { blurb: $event })" /></label>
        </div>
      </div>
      <p class="adm-note">Фото и тексты категорий сохраняются сразу. Большие изображения
        автоматически уменьшаются перед сохранением.</p>
    </section>
  `,
})
export class ContentAdminComponent {
  readonly store = inject(DataStore);

  c: SiteContent = { ...this.store.content() };
  readonly dirty = signal(false);
  readonly saved = signal(false);

  touch(): void {
    this.dirty.set(true);
    this.saved.set(false);
  }

  saveContent(): void {
    this.store.updateContent({ ...this.c });
    this.dirty.set(false);
    this.saved.set(true);
  }

  patchCat(cat: CategoryDef, patch: Partial<CategoryDef>): void {
    this.store.updateCategory({ ...cat, ...patch });
  }

  onPhoto(ev: Event, cat: CategoryDef): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.downscale(file, 900, 0.8).then((dataUrl) => {
      this.store.updateCategory({ ...cat, img: dataUrl });
    });
    input.value = '';
  }

  /** Resize an uploaded image to a max dimension and return a JPEG data URL,
   *  keeping localStorage small. Swap for Storage upload once Firebase is on. */
  private downscale(file: File, maxPx: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}
