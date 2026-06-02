import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavService } from '../../core/nav.service';
import { DataStore } from '../../services/data-store.service';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  readonly year  = new Date().getFullYear();
  readonly store = inject(DataStore);
  private readonly nav = inject(NavService);

  readonly catalog = [
    { label: 'Трубы ПП / ПВХ',         cat: 'pipe'     },
    { label: 'Колена и отводы',         cat: 'bend'     },
    { label: 'Тройники и крестовины',   cat: 'tee'      },
    { label: 'Муфты соединительные',    cat: 'coupling' },
    { label: 'Редукции и переходы',     cat: 'reducer'  },
    { label: 'Ревизии прочистные',      cat: 'revision' },
    { label: 'Заглушки',                cat: 'plug'     },
    { label: 'Крепления и хомуты',      cat: 'clamp'    },
    { label: 'Спецэлементы',            cat: 'special'  },
  ];

  tel(raw: string): string { return raw.replace(/[^\d+]/g, ''); }
  go(id: string): void { this.nav.go(id); }
}
