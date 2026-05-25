import type { Plugin } from "vite";
import type { Connect } from "vite";
import {
  copyFileSync,
  createReadStream,
  existsSync,
  readFileSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";

const RESOLVED_VIRTUAL = "\0virtual:project-entry";

/** 将 logo 中间件插到 connect 栈最前，优先于 public/ 静态资源 */
function prependMiddleware(
  middlewares: Connect.Server,
  handler: Connect.NextHandleFunction
) {
  middlewares.use(handler);
  const stack = middlewares.stack;
  if (stack.length > 1) {
    const layer = stack.pop();
    if (layer) stack.unshift(layer);
  }
}

/**
 * 多项目并行 dev/build：
 * - virtual:project-entry：按 VITE_APP_SYSTEM 仅加载当前 src/<project>.ts
 * - dev：拦截 platform-config.json，按进程注入 Title（不写磁盘）
 * - dev：拦截 /logo.png，返回子应用 src/assets/logo.png（插在静态中间件之前）
 * - build：在产物目录覆盖写入 platform-config.json 与 logo.png
 */
export function owlBuilderProjectPlugin(options: { root: string }): Plugin {
  let outDir = "";
  let isBuild = false;

  return {
    name: "owl-builder-project",
    enforce: "pre",
    configResolved(config) {
      outDir = config.build.outDir;
      isBuild = config.command === "build";
    },
    resolveId(id) {
      if (id === "virtual:project-entry") return RESOLVED_VIRTUAL;
      return undefined;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL) return undefined;

      const project = process.env.VITE_APP_SYSTEM;
      if (!project) {
        return `
export function loadProjectEntry() {
  return Promise.reject(new Error(
    "[owl-ui-builder] 缺少环境变量 VITE_APP_SYSTEM，请使用 pnpm dev <project> 或 pnpm build <project>"
  ));
}
`;
      }

      const abs = join(options.root, "src", `${project}.ts`);
      if (!existsSync(abs)) {
        return `
export function loadProjectEntry() {
  return Promise.reject(new Error("[owl-ui-builder] 入口不存在: src/${project}.ts"));
}
`;
      }

      return `export function loadProjectEntry() {\n  return import(${JSON.stringify(abs)});\n}\n`;
    },
    configureServer(server) {
      const logoPath = process.env.VITE_APP_LOGO_PATH;

      if (logoPath) {
        prependMiddleware(server.middlewares, (req, res, next) => {
          const base = server.config.base.replace(/\/$/, "") || "";
          const pathname = new URL(req.url || "/", "http://vite.local").pathname;
          const logoUrlPaths = new Set<string>(["/logo.png"]);
          if (base) logoUrlPaths.add(`${base}/logo.png`);

          if (!logoUrlPaths.has(pathname)) {
            next();
            return;
          }
          if (!existsSync(logoPath)) {
            next();
            return;
          }
          res.setHeader("Content-Type", "image/png");
          res.setHeader("Cache-Control", "no-cache");
          createReadStream(logoPath).pipe(res);
        });
      }

      server.middlewares.use((req, res, next) => {
        const title = process.env.VITE_APP_TITLE?.trim();
        if (!title) {
          next();
          return;
        }

        const base = server.config.base.replace(/\/$/, "") || "";
        const pathname = new URL(req.url || "/", "http://vite.local").pathname;

        const paths = new Set<string>(["/platform-config.json"]);
        if (base) paths.add(`${base}/platform-config.json`);

        let hit = false;
        for (const p of paths) {
          if (pathname === p) {
            hit = true;
            break;
          }
        }
        if (!hit) {
          next();
          return;
        }

        const platformPath = join(options.root, "public", "platform-config.json");
        if (!existsSync(platformPath)) {
          next();
          return;
        }

        try {
          const json = JSON.parse(readFileSync(platformPath, "utf8")) as Record<
            string,
            unknown
          >;
          json.Title = title;
          const body = `${JSON.stringify(json, null, 2)}\n`;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(body);
        } catch {
          next();
        }
      });
    },
    closeBundle() {
      if (!isBuild) return;

      const title = process.env.VITE_APP_TITLE?.trim();
      const platformPath = join(options.root, "public", "platform-config.json");
      if (title && existsSync(platformPath)) {
        try {
          const json = JSON.parse(readFileSync(platformPath, "utf8")) as Record<
            string,
            unknown
          >;
          json.Title = title;
          writeFileSync(
            join(outDir, "platform-config.json"),
            `${JSON.stringify(json, null, 2)}\n`
          );
        } catch {
          /* ignore */
        }
      }

      const logoPath = process.env.VITE_APP_LOGO_PATH;
      if (logoPath && existsSync(logoPath)) {
        try {
          copyFileSync(logoPath, join(outDir, "logo.png"));
        } catch {
          /* ignore */
        }
      }
    }
  };
}
