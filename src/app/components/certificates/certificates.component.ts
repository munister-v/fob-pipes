import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RevealDirective } from '../../shared/reveal.directive';

interface Cert {
  code: string;
  title: string;
  note: string;
}

interface Award {
  src: string;
  year: string;
  title: string;
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
    { code: 'ГОСТ', title: 'Соответствие ГОСТ', note: 'Трубы и фитинги по действующим государственным стандартам.' },
    { code: 'SN4',  title: 'Кольцевая жёсткость', note: 'Наружные системы класса жёсткости SN4.' },
    { code: 'ISO',  title: 'Контроль качества', note: 'Внутренний контроль геометрии и состава сырья.' },
    { code: 'ТУ',   title: 'Технические условия', note: 'Изделия по утверждённым ТУ предприятия.' },
  ];

  readonly awards: Award[] = [
    { src: 'assets/img/production/aqwa_term2005.jpg', year: '2005', title: 'Aqua-Therm Киев 2005' },
    { src: 'assets/img/production/aqwa_term2006.jpg', year: '2006', title: 'Aqua-Therm Киев 2006' },
    { src: 'assets/img/production/aqwa_term2007.jpg', year: '2007', title: 'Aqua-Therm Киев 2007' },
    { src: 'assets/img/production/aqwa_term2008.jpg', year: '2008', title: 'Aqua-Therm Киев 2008' },
  ];
}
