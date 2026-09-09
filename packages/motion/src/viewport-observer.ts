import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import type { MotionViewportOptions } from '@angular-motion/core';

export interface MotionViewportEntry {
  readonly element: Element;
  readonly inView: boolean;
  readonly intersectionRatio: number;
}

export type MotionViewportCallback = (entry: MotionViewportEntry) => void;

type ObserverConstructor = new (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => IntersectionObserver;

interface ObserverHost {
  IntersectionObserver?: ObserverConstructor;
}

interface ObserverTarget {
  readonly callback: MotionViewportCallback;
  readonly once: boolean;
}

interface ObserverGroup {
  readonly observer: IntersectionObserver;
  readonly targets: Map<Element, ObserverTarget>;
}

interface NormalizedViewportOptions {
  readonly key: string;
  readonly options: IntersectionObserverInit;
  readonly once: boolean;
}

@Injectable({ providedIn: 'root' })
export class MotionViewportObserver {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly documentRef = inject(DOCUMENT, { optional: true });
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly groups = new Map<string, ObserverGroup>();
  private readonly rootIds = new WeakMap<object, number>();
  private nextRootId = 0;

  observe(
    element: Element,
    viewport: MotionViewportOptions | undefined,
    callback: MotionViewportCallback
  ): () => void {
    if (!this.isBrowser) {
      return () => undefined;
    }

    const host = this.currentWindow(element) as ObserverHost | undefined;
    const Observer = host?.IntersectionObserver;

    if (Observer === undefined) {
      callback({
        element,
        inView: true,
        intersectionRatio: 1
      });
      return () => undefined;
    }

    const normalized = this.normalizeOptions(viewport);
    let group = this.groups.get(normalized.key);

    if (group === undefined) {
      group = this.createGroup(Observer, normalized);
      this.groups.set(normalized.key, group);
    }

    group.targets.set(element, {
      callback,
      once: normalized.once
    });
    group.observer.observe(element);

    return () => {
      this.release(normalized.key, element);
    };
  }

  activeObserverCount(): number {
    return this.groups.size;
  }

  private createGroup(
    Observer: ObserverConstructor,
    normalized: NormalizedViewportOptions
  ): ObserverGroup {
    const targets = new Map<Element, ObserverTarget>();
    const observer = new Observer((entries: IntersectionObserverEntry[]) => {
      for (const entry of entries) {
        const target = targets.get(entry.target);

        if (target === undefined) {
          continue;
        }

        const inView = entry.isIntersecting || entry.intersectionRatio > 0;
        target.callback({
          element: entry.target,
          inView,
          intersectionRatio: entry.intersectionRatio
        });

        if (inView && target.once) {
          observer.unobserve(entry.target);
          targets.delete(entry.target);

          if (targets.size === 0) {
            observer.disconnect();
            this.groups.delete(normalized.key);
          }
        }
      }
    }, normalized.options);

    return { observer, targets };
  }

  private release(key: string, element: Element): void {
    const group = this.groups.get(key);

    if (group === undefined) {
      return;
    }

    group.observer.unobserve(element);
    group.targets.delete(element);

    if (group.targets.size === 0) {
      group.observer.disconnect();
      this.groups.delete(key);
    }
  }

  private normalizeOptions(
    viewport: MotionViewportOptions | undefined
  ): NormalizedViewportOptions {
    const threshold = thresholdFromAmount(viewport?.amount);
    const margin = viewport?.margin ?? '0px';
    const root = viewport?.root ?? null;
    const options: IntersectionObserverInit = {
      root,
      rootMargin: margin,
      threshold
    };
    const rootId = root === null ? 'viewport' : this.rootId(root);
    const thresholdKey = Array.isArray(threshold)
      ? threshold.join(',')
      : String(threshold);

    return {
      key: `${rootId}|${margin}|${thresholdKey}`,
      once: viewport?.once ?? false,
      options
    };
  }

  private rootId(root: Element | Document): string {
    const existing = this.rootIds.get(root);

    if (existing !== undefined) {
      return `root:${existing}`;
    }

    const id = this.nextRootId;
    this.nextRootId += 1;
    this.rootIds.set(root, id);
    return `root:${id}`;
  }

  private currentWindow(element: Element): Window | undefined {
    return (
      element.ownerDocument?.defaultView ??
      this.documentRef?.defaultView ??
      undefined
    );
  }
}

export function thresholdFromAmount(
  amount: MotionViewportOptions['amount']
): number {
  if (amount === undefined || amount === 'some') {
    return 0;
  }

  if (amount === 'all') {
    return 1;
  }

  if (!Number.isFinite(amount) || amount < 0 || amount > 1) {
    throw new Error('Motion viewport amount must be "some", "all", or a number between 0 and 1.');
  }

  return amount;
}
