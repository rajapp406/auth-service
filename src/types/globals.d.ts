// Type definitions for browser globals
declare const window: Window & typeof globalThis & {
  localStorage?: Storage;
  location?: Location;
};

declare const localStorage: Storage | undefined;
declare const sessionStorage: Storage | undefined;

declare interface Window {
  localStorage?: Storage;
  location?: Location;
}
