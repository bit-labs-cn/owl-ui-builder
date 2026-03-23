import vue from "@vitejs/plugin-vue";
import svgLoader from "vite-svg-loader";
import vueJsx from "@vitejs/plugin-vue-jsx";
import type { PluginOption } from "vite";
import removeNoMatch from "vite-plugin-router-warn";
import removeConsole from "vite-plugin-remove-console";
import VueI18nPlugin from "@intlify/unplugin-vue-i18n/vite";
import path from "node:path";

import {
    resolvePackagePath,
    getWorkspacePackages,
    pathResolve,
    configCompressPlugin
  } from "@bit-labs.cn/owl-ui/build-preset";

const toPosixPath = (p: string) => p.split(path.sep).join("/");

const workspacePackages = getWorkspacePackages({
  workspaceFilePath: pathResolve("../pnpm-workspace.yaml", import.meta.url),
  onlyExternal: true
});

const workspaceLocalesGlobs = Array.from(
  new Set(
    workspacePackages.map(item =>
      toPosixPath(path.join(item.dir, "locales", "**"))
    )
  )
);
export const plugins = (VITE_COMPRESSION: string) : PluginOption[] => {
  return [
    vue(),
    vueJsx(),
    VueI18nPlugin({
      include: [
        resolvePackagePath("@bit-labs.cn/owl-ui", "locales/**"),
        ...workspaceLocalesGlobs
      ]
    }),
    removeNoMatch(),
    svgLoader(),
    configCompressPlugin(String(VITE_COMPRESSION) as any) as unknown as PluginOption,
    removeConsole({ external: ["src/assets/iconfont/iconfont.js"] })
  ]
}