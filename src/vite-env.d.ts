/// <reference types="vite/client" />

declare module "virtual:project-entry" {
  export function loadProjectEntry(): Promise<unknown>;
}
