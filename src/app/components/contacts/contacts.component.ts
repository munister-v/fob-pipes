import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavService } from '../../core/nav.service';
import { RevealDirective } from '../../shared/reveal.directive';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss',
})
export class ContactsComponent {
  private readonly nav = inject(NavService);

  go(id: string): void {
    this.nav.go(id);
  }
}
