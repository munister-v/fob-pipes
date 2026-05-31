import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ContactsComponent } from '../components/contacts/contacts.component';

@Component({
  selector: 'app-contacts-page',
  standalone: true,
  imports: [ContactsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<app-contacts />`,
})
export class ContactsPage {}
