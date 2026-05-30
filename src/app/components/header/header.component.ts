import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteService } from '../../services/quote.service';
import { LocaleService } from '../../services/locale.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly quote = inject(QuoteService);
  readonly locale = inject(LocaleService);

  readonly scrolled = signal(false);
  readonly catalogOpen = signal(false);
  readonly contactOpen = signal(false);
  readonly mobileOpen = signal(false);

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 16);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 1080 && this.mobileOpen()) {
      this.mobileOpen.set(false);
      document.body.style.overflow = '';
    }
  }

  toggleCatalog(): void {
    this.catalogOpen.update((v) => !v);
    this.contactOpen.set(false);
  }
  toggleContact(): void {
    this.contactOpen.update((v) => !v);
    this.catalogOpen.set(false);
  }

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
    document.body.style.overflow = this.mobileOpen() ? 'hidden' : '';
  }

  closeAll(): void {
    this.catalogOpen.set(false);
    this.contactOpen.set(false);
    this.mobileOpen.set(false);
    document.body.style.overflow = '';
  }

  go(id: string): void {
    this.closeAll();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
