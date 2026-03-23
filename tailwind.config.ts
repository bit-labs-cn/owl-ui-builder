import type { Config } from "tailwindcss";
import path from "node:path";
import { getWorkspacePackages, pathResolve } from "@bit-labs.cn/owl-ui/build-preset";

const toPosixPath = (p: string) => p.split(path.sep).join("/");

const workspacePackages = getWorkspacePackages({
  workspaceFilePath: pathResolve("./pnpm-workspace.yaml", import.meta.url),
  onlyExternal: true
});


const workspaceSrcGlobs = Array.from(
  new Set(
    workspacePackages.map(item =>
      `${toPosixPath(path.join(item.dir, "src"))}/**/*.{vue,js,ts,jsx,tsx}`
    )
  )
);

export default {
  darkMode: "class",
  corePlugins: {
    preflight: false
  },
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
    ...workspaceSrcGlobs
  ],
  theme: {
    extend: {
      colors: {
        bg_color: "var(--el-bg-color)",
        primary: "var(--el-color-primary)",
        text_color_primary: "var(--el-text-color-primary)",
        text_color_regular: "var(--el-text-color-regular)"
      }
    }
  }
} satisfies Config;
