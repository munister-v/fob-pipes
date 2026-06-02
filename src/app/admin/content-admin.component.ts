import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DataStore, SiteContent } from '../services/data-store.service';
import { CategoryDef } from '../models/product.model';
import { ToastService } from './toast.service';

type Tab = 'main' | 'about' | 'contacts' | 'categories' | 'company' | 'help';

@Component({
  selector: 'app-content-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div>
        <h1 class="adm-title">Контент сайта</h1>
        <p class="adm-sub">Тексты, контакты, фото категорий и справка</p>
      </div>
      <div class="adm-head__actions">
        <a class="adm-btn" href="./" target="_blank" rel="noopener">↗ Открыть сайт</a>
        <button class="adm-btn adm-btn--accent" (click)="saveContent()" [disabled]="!dirty()">
          {{ saved() ? '✓ Сохранено' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <!-- Tabs -->
    <div class="adm-tabs adm-tabs--wrap" style="margin-bottom:22px">
      <button [class.is-active]="tab() === 'main'"       (click)="tab.set('main')">Главный экран</button>
      <button [class.is-active]="tab() === 'about'"      (click)="tab.set('about')">О компании</button>
      <button [class.is-active]="tab() === 'contacts'"   (click)="tab.set('contacts')">Контакты</button>
      <button [class.is-active]="tab() === 'categories'" (click)="tab.set('categories')">
        Категории <i>{{ store.categories().length }}</i>
      </button>
      <button [class.is-active]="tab() === 'company'"    (click)="tab.set('company')">Реквизиты</button>
      <button [class.is-active]="tab() === 'help'"       (click)="tab.set('help')">Справка</button>
    </div>

    <!-- ═══════════════ MAIN ═══════════════ -->
    <ng-container *ngIf="tab() === 'main'">
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>Главный экран (Hero)</h2>
          <span class="adm-sub">Видно на первом экране при входе на сайт</span>
        </div>
        <label class="adm-field">
          <span>Заголовок · крупная надпись</span>
          <input [(ngModel)]="c.heroTitle" (ngModelChange)="touch()"
                 placeholder="ПРОИЗВОДИТЕЛЬ ТРУБ И ФИТИНГОВ" />
        </label>
        <label class="adm-field">
          <span>Подзаголовок · описание под заголовком</span>
          <textarea rows="2" [(ngModel)]="c.heroSubtitle" (ngModelChange)="touch()"
                    placeholder="Одно из первых и крупнейших производств пластиковой канализации…"></textarea>
        </label>
        <label class="adm-field">
          <span>Текст кнопки CTA</span>
          <input [(ngModel)]="c.heroCta" (ngModelChange)="touch()"
                 placeholder="Каталог продукции" />
        </label>
        <p class="adm-note">
          Изменения применятся к главной странице после нажатия «Сохранить».
          Изображение героя (фон) меняется в файлах <code>src/assets/img/hero-pipes.jpg</code> через коммит в репозиторий —
          через интерфейс пока недоступно.
        </p>
      </section>
    </ng-container>

    <!-- ═══════════════ ABOUT ═══════════════ -->
    <ng-container *ngIf="tab() === 'about'">
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>О компании</h2>
          <span class="adm-sub">Раздел «Производство» и страница /proizvodstvo</span>
        </div>
        <label class="adm-field">
          <span>Вступление · первый абзац</span>
          <textarea rows="3" [(ngModel)]="c.aboutLead" (ngModelChange)="touch()"></textarea>
        </label>
        <label class="adm-field">
          <span>Основной текст · подробнее о заводе</span>
          <textarea rows="5" [(ngModel)]="c.aboutBody" (ngModelChange)="touch()"></textarea>
        </label>
      </section>
    </ng-container>

    <!-- ═══════════════ CONTACTS ═══════════════ -->
    <ng-container *ngIf="tab() === 'contacts'">
      <div class="adm-grid-cols">
        <section class="adm-card">
          <div class="adm-card__head"><h2>Контактные данные</h2></div>
          <label class="adm-field">
            <span>Телефон · основной</span>
            <input [(ngModel)]="c.phone" (ngModelChange)="touch()"
                   placeholder="+7 (949) 306-35-22" class="adm-mono" />
          </label>
          <label class="adm-field">
            <span>Телефон · дополнительный</span>
            <input [(ngModel)]="c.viber" (ngModelChange)="touch()"
                   placeholder="+7 (949) 624-99-80" class="adm-mono" />
          </label>
          <label class="adm-field">
            <span>E-mail</span>
            <input [(ngModel)]="c.email" (ngModelChange)="touch()"
                   placeholder="FOBDonetsk@gmail.com" type="email" />
          </label>
          <label class="adm-field">
            <span>Адрес</span>
            <input [(ngModel)]="c.address" (ngModelChange)="touch()"
                   placeholder="г. Донецк, ул. Калинина, 102" />
          </label>
          <label class="adm-field">
            <span>График работы</span>
            <input [(ngModel)]="c.hours" (ngModelChange)="touch()"
                   placeholder="Пн–Пт · 08:00–17:00" />
          </label>
        </section>

        <section class="adm-card">
          <div class="adm-card__head"><h2>Превью футера</h2></div>
          <div class="adm-preview">
            <div class="adm-preview__row">
              <span class="adm-preview__lbl">Телефон</span>
              <span class="adm-preview__val">{{ c.phone || '—' }}</span>
            </div>
            <div class="adm-preview__row">
              <span class="adm-preview__lbl">Доп. тел.</span>
              <span class="adm-preview__val">{{ c.viber || '—' }}</span>
            </div>
            <div class="adm-preview__row">
              <span class="adm-preview__lbl">Email</span>
              <span class="adm-preview__val">{{ c.email || '—' }}</span>
            </div>
            <div class="adm-preview__row">
              <span class="adm-preview__lbl">Адрес</span>
              <span class="adm-preview__val">{{ c.address || '—' }}</span>
            </div>
            <div class="adm-preview__row">
              <span class="adm-preview__lbl">График</span>
              <span class="adm-preview__val">{{ c.hours || '—' }}</span>
            </div>
          </div>
          <p class="adm-note">
            Контакты автоматически подставляются в футер, шапку CTA и блок «Связаться»
            на странице /kontakty.
          </p>
        </section>
      </div>
    </ng-container>

    <!-- ═══════════════ CATEGORIES ═══════════════ -->
    <ng-container *ngIf="tab() === 'categories'">
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>Категории продукции</h2>
          <span class="adm-sub">{{ store.categories().length }} категорий · сохраняются сразу</span>
        </div>
        <p class="adm-warn" style="margin-bottom:18px">
          ℹ Загружайте качественные фото — большие изображения автоматически уменьшаются до
          900&nbsp;px и сжимаются в JPG. Чтобы добавить новую категорию — измените файл
          <code>catalog.data.ts</code> в репозитории.
        </p>

        <div class="adm-cats">
          <div class="adm-cat" *ngFor="let cat of store.categories()">
            <div class="adm-cat__thumb">
              <img [src]="cat.img" [alt]="cat.title" />
              <label class="adm-cat__upload">
                ↑ Загрузить фото
                <input type="file" accept="image/*" hidden (change)="onPhoto($event, cat)" />
              </label>
            </div>
            <div style="display:flex;gap:6px;align-items:center;margin-bottom:8px">
              <span class="adm-pill adm-pill--new">{{ cat.index }}</span>
              <span class="adm-mono" style="font-size:11px;color:var(--c-ink-faint)">{{ cat.id }}</span>
            </div>
            <label class="adm-field adm-field--sm">
              <span>Название</span>
              <input [ngModel]="cat.title" (ngModelChange)="patchCat(cat, { title: $event })" />
            </label>
            <label class="adm-field adm-field--sm">
              <span>Описание (до 100 символов)</span>
              <textarea rows="2" [ngModel]="cat.blurb" (ngModelChange)="patchCat(cat, { blurb: $event })"></textarea>
            </label>
          </div>
        </div>
      </section>
    </ng-container>

    <!-- ═══════════════ COMPANY (реквизиты) ═══════════════ -->
    <ng-container *ngIf="tab() === 'company'">
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>Реквизиты компании</h2>
          <span class="adm-sub">Используются в PDF (КП и счетах)</span>
        </div>
        <label class="adm-field">
          <span>Юридическое название</span>
          <input [(ngModel)]="c.companyLegal" (ngModelChange)="touch()"
                 placeholder="Общество с ограниченной ответственностью «Ф.О.Б»" />
        </label>
        <label class="adm-field">
          <span>ОГРН / ЕДРПОУ / Регистрационный код</span>
          <input [(ngModel)]="c.companyCode" (ngModelChange)="touch()"
                 placeholder="000000000000" class="adm-mono" />
        </label>
        <p class="adm-note">
          Реквизиты подставляются в шапку PDF-документов (счёт на оплату, коммерческое
          предложение). Полные банковские реквизиты для счёта добавьте в основной текст
          «О компании» если нужны на сайте.
        </p>
      </section>
    </ng-container>

    <!-- ═══════════════ HELP / СПРАВКА ═══════════════ -->
    <ng-container *ngIf="tab() === 'help'">

      <!-- Как добавить товар -->
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>📦 Как добавить новый товар</h2>
        </div>
        <ol class="adm-help-steps">
          <li>Откройте раздел <a routerLink="/admin/catalog" class="adm-link">Каталог</a>
            и нажмите <b>«+ Товар»</b> в правом верхнем углу.</li>
          <li>Заполните обязательные поля:
            <ul>
              <li><b>Артикул</b> — уникальный код (например <code>PP-IN-110</code>).
                Используется в Excel, PDF и для 1С. После создания изменить нельзя.</li>
              <li><b>Название</b> — отображается в каталоге и в PDF.</li>
              <li><b>Категория</b> — одна из 9 групп (трубы, отводы и т.д.).</li>
              <li><b>Диаметр</b> — в мм, число.</li>
            </ul>
          </li>
          <li>Заполните цены (необязательно). Если поле <b>Цена розничная</b> пустое — в каталоге
            и в PDF показывается «—» вместо цены.</li>
          <li>Загрузите фото товара в блоке <b>«Фото товара»</b> — JPG/PNG до 5 МБ.
            Изображение автоматически уменьшается до 900 px по большей стороне и сжимается.
            Если фото не загружено — будет использовано общее фото категории.</li>
          <li>Нажмите <b>«Сохранить»</b>. Товар сразу появится на сайте.</li>
        </ol>
      </section>

      <!-- Как залить изображение -->
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>🖼 Загрузка изображений</h2>
        </div>
        <div class="adm-help-grid">
          <div>
            <h3 class="adm-help-h">Где загружать</h3>
            <ul>
              <li><b>Фото категории</b> — в этом разделе на вкладке «Категории»: кнопка
                «↑ Загрузить фото» поверх миниатюры. Показывается на главной и в каталоге.</li>
              <li><b>Фото товара</b> — в редакторе товара (Каталог → ✎ или + Товар),
                блок «Фото товара». Видно в админке и (в будущем) на карточке товара.</li>
              <li><b>Логотип, hero-фон, фото производства</b> — пока меняются только через файлы
                в репозитории <code>src/assets/img/</code>. Скажите мне — добавлю.</li>
            </ul>
          </div>
          <div>
            <h3 class="adm-help-h">Что загружать</h3>
            <ul>
              <li><b>Формат:</b> JPG или PNG. PNG лучше для прозрачного фона.</li>
              <li><b>Размер:</b> до 5 МБ. Большое фото — лучше: всё равно ужмётся
                до 900 px по большей стороне.</li>
              <li><b>Пропорции:</b> категории — 16:10 горизонтальные.
                Товары — квадратные или вертикальные 3:4.</li>
              <li><b>Фон:</b> для товаров — белый или прозрачный, чтобы выглядело
                «как в каталоге». Для категорий — реальное фото продукции.</li>
            </ul>
          </div>
        </div>
        <p class="adm-note adm-note--ok">
          ✓ <b>Совет:</b> Сделайте фото на телефон на белом фоне (лист бумаги),
          обрежьте лишнее в любом редакторе → готово к загрузке. Угол съёмки —
          сверху или сбоку под небольшим углом.
        </p>
      </section>

      <!-- SVG-иконки -->
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>⚡ SVG-иконки (для разработчика)</h2>
        </div>
        <p class="adm-note" style="margin-top:0">
          На сайте часть иконок — SVG-векторы (труба, фитинг и т.д.). Они вшиты в код
          и редактируются через repository: <code>src/app/components/footer/footer.component.ts</code> и
          <code>src/app/admin/admin-shell.component.ts</code>.
        </p>
        <p class="adm-note">
          Если хотите добавить новую иконку — пришлите SVG-файл или ссылку на иконку с
          <code>lucide.dev</code>, <code>tabler-icons.io</code> или <code>heroicons.com</code>.
          Все эти библиотеки бесплатные, иконки в стиле сайта (тонкая обводка 1.8 px).
        </p>
      </section>

      <!-- КОЛЬЦЕВАЯ ЖЁСТКОСТЬ SN -->
      <section class="adm-card">
        <div class="adm-card__head">
          <h2>🏗 Кольцевая жёсткость наружных труб (SN)</h2>
          <span class="adm-sub">Подробный технический справочник</span>
        </div>

        <div class="adm-sn">
          <p class="adm-sn__intro">
            <b>Кольцевая жёсткость (SN — Stiffness Nominal)</b> — это способность трубы
            сопротивляться кольцевой деформации под нагрузкой грунта и транспорта.
            Измеряется в <b>кН/м²</b> и определяется лабораторным методом по стандартам
            <code>EN ISO 9969</code> (международный) и <code>ГОСТ 32415-2013</code> /
            <code>ГОСТ Р 56927-2016</code> (РФ/СНГ).
          </p>

          <h3 class="adm-sn__h">Как измеряется</h3>
          <p>
            Образец трубы длиной около 300&nbsp;мм сжимается между двумя плоскими плитами
            пресса со скоростью <b>5&nbsp;мм/мин</b> до прогиба <b>3% от номинального диаметра</b>.
            Фиксируется усилие — на его основе вычисляется кольцевая жёсткость по формуле:
          </p>
          <pre class="adm-sn__formula">SN = F × y⁻¹ × коэффициент / (длина × Ø²)</pre>
          <p>
            Результат округляется до ближайшего стандартного класса:
            <b>SN&nbsp;2 / SN&nbsp;4 / SN&nbsp;8 / SN&nbsp;16</b> кН/м².
          </p>

          <h3 class="adm-sn__h">Классы и где применяются</h3>
          <div class="adm-sn__table">
            <div class="adm-sn__row adm-sn__row--head">
              <span>Класс</span><span>Жёсткость, кН/м²</span><span>Глубина залегания</span><span>Где применять</span>
            </div>
            <div class="adm-sn__row">
              <span class="adm-mono">SN 2</span>
              <span class="adm-mono">≥ 2</span>
              <span>до 1 м</span>
              <span>Ливневая канализация, дренаж под пешеходными зонами</span>
            </div>
            <div class="adm-sn__row adm-sn__row--accent">
              <span class="adm-mono">SN 4</span>
              <span class="adm-mono">≥ 4</span>
              <span>1–4 м, без транспорта</span>
              <span><b>Стандартный класс</b> · бытовая канализация частных домов,
                под газонами, дворами</span>
            </div>
            <div class="adm-sn__row adm-sn__row--accent">
              <span class="adm-mono">SN 8</span>
              <span class="adm-mono">≥ 8</span>
              <span>2–6 м, под дорогами</span>
              <span><b>Усиленный класс</b> · магистральные сети, под автодорогами,
                грузовыми проездами</span>
            </div>
            <div class="adm-sn__row">
              <span class="adm-mono">SN 16</span>
              <span class="adm-mono">≥ 16</span>
              <span>свыше 6 м, тяжёлые нагрузки</span>
              <span>Глубокое заложение, аэродромы, ж/д переходы</span>
            </div>
          </div>

          <h3 class="adm-sn__h">Что производит Ф.О.Б</h3>
          <ul class="adm-sn__list">
            <li><b>SN 4</b> — основной класс. Подходит для подавляющего большинства
              задач: бытовая канализация в частных домах, дренаж под дворами и газонами,
              ливневая канализация без проезда транспорта.</li>
            <li><b>SN 8</b> — для нагруженных участков: укладка под автодорогами,
              паркингами, на глубине 2–6 м. Толщина стенки больше, цена выше на 20–30%.</li>
          </ul>

          <h3 class="adm-sn__h">Как выбрать SN под объект</h3>
          <ol class="adm-sn__steps">
            <li>
              <b>Где будет лежать труба?</b><br />
              Газон, двор, огород → <b>SN 4</b><br />
              Дорога, паркинг, проезд КамАЗов → <b>SN 8</b><br />
              Глубокая магистраль (&gt; 6 м) → <b>SN 16</b>
            </li>
            <li>
              <b>На какой глубине?</b><br />
              До 1 м → SN 2 хватит, но обычно ставят SN 4 «с запасом»<br />
              1–4 м без транспорта → <b>SN 4</b><br />
              2–6 м или под нагрузкой → <b>SN 8</b><br />
              Свыше 6 м → <b>SN 16</b>
            </li>
            <li>
              <b>Какой грунт?</b><br />
              Песок, дренирующий → SN 4 спокойно<br />
              Глина, пучинистый, нестабильный → лучше <b>SN 8</b> с запасом
            </li>
            <li>
              <b>Какие нагрузки на трубу?</b><br />
              Только грунт → SN 4<br />
              + Транспорт (легковой) → SN 4 на глубине &gt; 1.2 м<br />
              + Грузовик / экскаватор → <b>SN 8</b>
            </li>
          </ol>

          <h3 class="adm-sn__h">Важные нюансы</h3>
          <ul class="adm-sn__list">
            <li>SN — это <b>не давление</b>! Канализационная труба работает без напора,
              классы SN характеризуют только сопротивление прогибу.</li>
            <li>Кольцевая жёсткость <b>не зависит от температуры</b> в пределах рабочего
              диапазона (–10 °C … +60 °C для ПВХ).</li>
            <li>За 50&nbsp;лет эксплуатации жёсткость постепенно снижается на 15–20% —
              это учтено в нормативах.</li>
            <li>Стандарты EN 1401 (Европа) и ГОСТ 32414 (СНГ) совместимы — труба SN 4 по
              EN = SN 4 по ГОСТ.</li>
            <li>Для напорных труб (водопровод ПНД) кольцевая жёсткость не нормируется —
              там используют классификацию <b>SDR</b> и <b>PN</b> (рабочее давление).</li>
          </ul>

          <h3 class="adm-sn__h">Стандарты и документы</h3>
          <div class="adm-sn__docs">
            <div class="adm-sn__doc">
              <span class="adm-mono">EN ISO 9969</span>
              <span>Метод определения кольцевой жёсткости</span>
            </div>
            <div class="adm-sn__doc">
              <span class="adm-mono">EN 1401</span>
              <span>Трубы ПВХ для безнапорной канализации</span>
            </div>
            <div class="adm-sn__doc">
              <span class="adm-mono">ГОСТ 32414-2013</span>
              <span>Трубы из ПВХ — общие технические условия</span>
            </div>
            <div class="adm-sn__doc">
              <span class="adm-mono">ГОСТ Р 56927-2016</span>
              <span>Определение кольцевой жёсткости (РФ)</span>
            </div>
          </div>

          <p class="adm-note adm-note--ok" style="margin-top:24px">
            ✓ <b>Коротко:</b> если объект бытовой или ливнёвка под газоном — берите <b>SN 4</b>.
            Если под дорогой, паркингом или на глубине &gt; 4 м — однозначно <b>SN 8</b>.
            При сомнениях звоните менеджеру, поможем подобрать по проекту.
          </p>
        </div>
      </section>

    </ng-container>
  `,
})
export class ContentAdminComponent {
  readonly store = inject(DataStore);
  private readonly toast = inject(ToastService);

  readonly tab = signal<Tab>('main');

  c: SiteContent = { ...this.store.content() };
  readonly dirty = signal(false);
  readonly saved = signal(false);

  touch(): void {
    this.dirty.set(true);
    this.saved.set(false);
  }

  saveContent(): void {
    this.store.updateContent({ ...this.c });
    this.dirty.set(false);
    this.saved.set(true);
    this.toast.ok('Контент сохранён');
    setTimeout(() => this.saved.set(false), 2000);
  }

  patchCat(cat: CategoryDef, patch: Partial<CategoryDef>): void {
    this.store.updateCategory({ ...cat, ...patch });
  }

  onPhoto(ev: Event, cat: CategoryDef): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.toast.err('Файл больше 5 МБ');
      return;
    }
    this.downscale(file, 900, 0.82).then((dataUrl) => {
      this.store.updateCategory({ ...cat, img: dataUrl });
      this.toast.ok(`Фото «${cat.title}» обновлено`);
    });
    input.value = '';
  }

  private downscale(file: File, maxPx: number, quality: number): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  }
}
