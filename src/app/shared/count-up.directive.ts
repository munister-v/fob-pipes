import { AfterViewInit, Directive, ElementRef, Input, OnDestroy, inject } from '@angular/core';

/**
 * Counts a number up from 0 to [countUp] when it scrolls into view.
 * Keeps an optional prefix/suffix around the value.
 * Usage: <span countUp [countUp]="30" suffix="+"></span>
 */
@Directive({
  selector: '[countUp]',
  standalone: true,
})
export class CountUpDirective implements AfterViewInit, OnDestroy {
  @Input('countUp') target = 0;
  @Input() duration = 1400;
  @Input() prefix = '';
  @Input() suffix = '';

  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;
  private raf = 0;

  ngAfterViewInit(): void {
    const el = this.host.nativeElement as HTMLElement;
    el.textContent = `${this.prefix}0${this.suffix}`;

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            this.run(el);
            this.observer?.unobserve(el);
          }
        }
      },
      { threshold: 0.4 }
    );
    this.observer.observe(el);
  }

  private run(el: HTMLElement): void {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / this.duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const val = Math.round(eased * this.target);
      el.textContent = `${this.prefix}${val}${this.suffix}`;
      if (p < 1) this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    cancelAnimationFrame(this.raf);
  }
}
