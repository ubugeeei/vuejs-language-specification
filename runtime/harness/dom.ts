import { createApp, nextTick } from "vue";
import type { App, Component } from "vue";
import { assert } from "./assert.ts";

export interface MountedApp {
  app: App<Element>;
  container: HTMLDivElement;
  cleanup(): void;
}

export function mount(component: Component): MountedApp {
  const container = document.createElement("div");
  document.body.append(container);
  const app = createApp(component);
  app.mount(container);

  return {
    app,
    container,
    cleanup() {
      app.unmount();
      container.remove();
    },
  };
}

export async function flushDom(): Promise<void> {
  await nextTick();
}

export function cleanupDom(): void {
  document.body.innerHTML = "";
}

export function queryByTestId<T extends Element>(container: ParentNode, testId: string): T | null {
  return container.querySelector<T>(`[data-testid='${testId}']`);
}

export function getByTestId<T extends Element>(container: ParentNode, testId: string): T {
  const element = queryByTestId<T>(container, testId);
  assert(element, `Expected element with data-testid="${testId}"`);
  return element;
}

export function normalizedText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

export function dispatchDomEvent(
  element: Element,
  type: string,
  init: EventInit = { bubbles: true },
): void {
  element.dispatchEvent(new Event(type, init));
}
