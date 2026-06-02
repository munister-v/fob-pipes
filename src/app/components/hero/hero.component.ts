import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavService } from '../../core/nav.service';
import { CountUpDirective } from '../../shared/count-up.directive';
import { DataStore } from '../../services/data-store.service';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule, CountUpDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hero.component.html',
  styleUrl: './hero.component.scss',
})
export class HeroComponent {
  readonly tickerDbl = [0, 1];
  readonly store = inject(DataStore);
  private readonly nav = inject(NavService);

  go(id: string): void { this.nav.go(id); }
}
