import {
  Component,
  ContentChild,
  DestroyRef,
  Injector,
  Input,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  inject
} from '@angular/core';
import type { AfterContentInit, EmbeddedViewRef } from '@angular/core';
import {
  MOTION_PRESENCE_CONTEXT,
  MotionPresenceContext
} from './presence-context';

@Component({
  selector: 'ng-motion-presence',
  standalone: true,
  template: '<ng-container #container></ng-container>'
})
export class NgMotionPresenceComponent implements AfterContentInit {
  @Input()
  set present(value: boolean | null | undefined) {
    this.presentValue = value === true;

    if (this.initialized) {
      this.setPresent(this.presentValue);
    }
  }

  get present(): boolean {
    return this.presentValue;
  }

  @ContentChild(TemplateRef) private readonly templateRef:
    | TemplateRef<unknown>
    | undefined;
  @ViewChild('container', { read: ViewContainerRef, static: true })
  private readonly viewContainerRef!: ViewContainerRef;

  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly context = new MotionPresenceContext();
  private embeddedView: EmbeddedViewRef<unknown> | undefined;
  private initialized = false;
  private presentValue = false;
  private generation = 0;
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.generation += 1;
      this.context.cancelExit();
      this.viewContainerRef.clear();
      this.embeddedView = undefined;
    });
  }

  ngAfterContentInit(): void {
    this.initialized = true;
    this.setPresent(this.presentValue);
  }

  private setPresent(nextPresent: boolean): void {
    if (this.destroyed) {
      return;
    }

    this.generation += 1;
    const generation = this.generation;

    if (nextPresent) {
      this.context.cancelExit();
      this.ensureView();
      return;
    }

    if (this.embeddedView === undefined) {
      return;
    }

    void this.context.startExit().then(() => {
      if (
        this.destroyed ||
        this.presentValue ||
        generation !== this.generation
      ) {
        return;
      }

      this.viewContainerRef.clear();
      this.embeddedView = undefined;
    });
  }

  private ensureView(): void {
    if (this.embeddedView !== undefined) {
      return;
    }

    if (this.templateRef === undefined) {
      throw new Error('ng-motion-presence requires an <ng-template> child.');
    }

    const injector = Injector.create({
      parent: this.injector,
      providers: [
        {
          provide: MOTION_PRESENCE_CONTEXT,
          useValue: this.context
        }
      ]
    });

    this.embeddedView = this.viewContainerRef.createEmbeddedView(
      this.templateRef,
      {},
      { injector }
    );
    this.embeddedView.detectChanges();
  }
}
