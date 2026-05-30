import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../shared/reveal.directive';

interface Cert {
  code: string;
  title: string;
  note: string;
}

@Component({
  selector: 'app-certificates',
  standalone: true,
  imports: [CommonModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './certificates.component.html',
  styleUrl: './certificates.component.scss',
})
export class CertificatesComponent {
  readonly certs: Cert[] = [
    { code: 'ГОСТ', title: 'Соответствие ГОСТ', note: 'Трубы и фитингы по действующим стандартам.' },
    { code: 'SN4', title: 'Кольцевая жёсткость', note: 'Наружные системы класса жёсткости SN4.' },
    { code: 'ISO', title: 'Контроль качества', note: 'Внутренний контроль геометрии и состава.' },
    { code: 'ТУ', title: 'Технические условия', note: 'Изделия по утверждённым ТУ предприятия.' },
  ];
}
