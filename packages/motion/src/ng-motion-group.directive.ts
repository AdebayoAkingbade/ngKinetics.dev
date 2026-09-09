import { Directive, ElementRef, Input, inject } from '@angular/core';

export type MotionStaggerDirection = 'forward' | 'reverse';

export interface MotionStaggerChild {
  readonly hostElement: HTMLElement;
}

@Directive({
  exportAs: 'ngMotionGroup',
  selector: '[ngMotionGroup]',
  standalone: true
})
export class NgMotionGroupDirective {
  @Input() stagger = 0;
  @Input() staggerDirection: MotionStaggerDirection = 'forward';

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly children = new Set<MotionStaggerChild>();

  register(child: MotionStaggerChild): () => void {
    this.children.add(child);

    return () => {
      this.children.delete(child);
    };
  }

  delayFor(child: MotionStaggerChild): number {
    this.validateInputs();

    if (this.stagger === 0 || !this.elementRef.nativeElement.contains(child.hostElement)) {
      return 0;
    }

    const ordered = Array.from(this.children)
      .filter((registeredChild) =>
        this.elementRef.nativeElement.contains(registeredChild.hostElement)
      )
      .sort((left, right) =>
        compareDocumentOrder(left.hostElement, right.hostElement)
      );
    const index = ordered.indexOf(child);

    if (index === -1) {
      return 0;
    }

    const effectiveIndex =
      this.staggerDirection === 'reverse'
        ? ordered.length - 1 - index
        : index;

    return effectiveIndex * this.stagger;
  }

  private validateInputs(): void {
    if (!Number.isFinite(this.stagger) || this.stagger < 0) {
      throw new Error('ngMotionGroup stagger must be a finite number greater than or equal to 0.');
    }

    if (
      this.staggerDirection !== 'forward' &&
      this.staggerDirection !== 'reverse'
    ) {
      throw new Error('ngMotionGroup staggerDirection must be "forward" or "reverse".');
    }
  }
}

function compareDocumentOrder(left: HTMLElement, right: HTMLElement): number {
  if (left === right) {
    return 0;
  }

  const position = left.compareDocumentPosition(right);
  const following = 4;
  const preceding = 2;

  if ((position & following) !== 0) {
    return -1;
  }

  if ((position & preceding) !== 0) {
    return 1;
  }

  return 0;
}
