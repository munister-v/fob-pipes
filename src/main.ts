import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { registerLocaleData } from '@angular/common';
import localeRu from '@angular/common/locales/ru';
import { LOCALE_ID } from '@angular/core';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

// Регистрируем русскую локаль — чтобы | number:'1.0-0':'ru', | date:'..':'ru' и т.д. работали корректно
registerLocaleData(localeRu, 'ru');

bootstrapApplication(AppComponent, {
  providers: [
    { provide: LOCALE_ID, useValue: 'ru' },
    provideAnimations(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })
    ),
  ],
}).catch((err) => console.error(err));
