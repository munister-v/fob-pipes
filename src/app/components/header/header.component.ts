import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { QuoteService } from '../../services/quote.service';
import { NavService } from '../../core/nav.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  readonly quote = inject(QuoteService);
  private readonly nav = inject(NavService);

  readonly scrolled = signal(false);
  readonly catalogOpen = signal(false);
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

  toggleMobile(): void {
    this.mobileOpen.update((v) => !v);
    document.body.style.overflow = this.mobileOpen() ? 'hidden' : '';
  }

  closeAll(): void {
    this.catalogOpen.set(false);
    this.mobileOpen.set(false);
    document.body.style.overflow = '';
  }

  /** legacy section-id navigation → routes (used by dropdown / drawer) */
  go(id: string): void {
    this.closeAll();
    this.nav.go(id);
  }
}
