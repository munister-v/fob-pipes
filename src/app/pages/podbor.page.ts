import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SelectorComponent } from '../components/selector/selector.component';

@Component({
  selector: 'app-podbor-page',
  standalone: true,
  imports: [SelectorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-selector />`,
})
export class PodborPage {}
