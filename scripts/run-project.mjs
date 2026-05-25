/**
 * 用法：pnpm dev <project> / pnpm build <project>
 * 例如：pnpm dev asset
 *
 * dev：自动从 .env.development 的 VITE_PORT 起探测空闲端口，支持多项目并行。
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import net from "node:net";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const mode = process.argv[2];
const project = process.argv[3];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

function readDevStartPort(projectRoot) {
  const p = join(projectRoot, ".env.development");
  if (!existsSync(p)) return 8851;
  const text = readFileSync(p, "utf8");
  const m = text.match(/^\s*VITE_PORT\s*=\s*(\d+)/m);
  return m ? Number(m[1]) : 8851;
}

/**
 * @param {string} builderRoot
 * @returns {{ name: string, dir: string }[]}
 */
function readPnpmWorkspacePackages(builderRoot) {
  const wsFile = join(builderRoot, "pnpm-workspace.yaml");
  if (!existsSync(wsFile)) return [];
  const map = parseYaml(readFileSync(wsFile, "utf8"));
  const paths = Array.isArray(map?.packages) ? map.packages : [];

  const result = [];
  for (const rel of paths) {
    if (typeof rel !== "string") continue;
    const dir = resolve(builderRoot, rel);
    const pkgFile = join(dir, "package.json");
    if (!existsSync(pkgFile)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
      if (pkg && typeof pkg.name === "string" && pkg.name.trim()) {
        result.push({ name: pkg.name, dir });
      }
    } catch {
      /* ignore */
    }
  }
  return result;
}

/**
 * @param {string} slug
 * @param {{ name: string, dir: string }[]} pkgs
 * @param {string} projectKey
 * @returns {string}
 */
function resolveLogoPath(slug, pkgs, projectKey) {
  const candidates = [
    `@bit-labs.cn/${slug}-ui`,
    `@bit-labs.cn/${slug}`,
    slug
  ];
  const hit = pkgs.find(p => candidates.includes(p.name));
  if (!hit) {
    fail(
      `项目 "${projectKey}" 的 logo "${slug}" 无法匹配到任何 workspace 包（已尝试：${candidates.join(", ")}）`
    );
  }
  const logoFile = join(hit.dir, "src", "assets", "logo.png");
  if (!existsSync(logoFile)) {
    fail(`项目 "${projectKey}" 的 logo "${slug}" 缺少文件：${logoFile}`);
  }
  return logoFile;
}

/**
 * @param {unknown} raw
 * @param {string} projectKey
 * @param {"dev" | "build"} mode
 * @returns {{ title: string, baseUrl: string, logoSlug: string | null }}
 */
function normalizeProjectConfig(raw, projectKey, mode) {
  if (typeof raw === "string") {
    fail(
      `项目 "${projectKey}" 配置无效：已不允许「仅填写标题字符串」，必须为对象并包含必填字段 title、baseUrl`
    );
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(
      `项目 "${projectKey}" 配置无效：必须为对象，且包含必填字段 title、baseUrl`
    );
  }

  const title = raw.title ?? raw.Title;
  if (typeof title !== "string" || !title.trim()) {
    fail(`项目 "${projectKey}" 缺少必填字段 title（非空字符串）`);
  }

  const buRaw =
    raw.baseUrl ??
    raw.base_url ??
    raw.VITE_BASE_URL ??
    raw.viteBaseUrl;

  let bu;
  if (typeof buRaw === "string") {
    /** 字符串简写：dev / build 都用同一个值（旧语义） */
    bu = buRaw;
  } else if (buRaw && typeof buRaw === "object" && !Array.isArray(buRaw)) {
    /** 对象形式：按 mode 取值，build 兼容 prod / production 别名，dev 兼容 development */
    bu =
      buRaw[mode] ??
      (mode === "build"
        ? buRaw.prod ?? buRaw.production
        : buRaw.development);
  } else {
    fail(`项目 "${projectKey}" 缺少必填字段 baseUrl`);
  }

  if (typeof bu !== "string" || !bu.trim()) {
    fail(
      `项目 "${projectKey}" 在 ${mode} 模式下缺少 baseUrl.${mode}（也未提供字符串简写）`
    );
  }

  const baseUrl = bu.trim().replace(/\/+$/, "") + "/";

  const logoRaw = raw.logo ?? raw.Logo;
  let logoSlug = null;
  if (logoRaw !== undefined && logoRaw !== null) {
    if (typeof logoRaw !== "string" || !logoRaw.trim()) {
      fail(`项目 "${projectKey}" 的 logo 必须为非空字符串（子应用短名）`);
    }
    logoSlug = logoRaw.trim();
  }

  return { title: title.trim(), baseUrl, logoSlug };
}

function findFreePort(startPort, maxAttempts = 80) {
  return new Promise((resolve, reject) => {
    let port = startPort;

    const tryListen = () => {
      if (port > startPort + maxAttempts) {
        reject(
          new Error(
            `无法在端口 ${startPort}–${startPort + maxAttempts} 范围内找到空闲端口`
          )
        );
        return;
      }

      const server = net.createServer();
      server.unref();
      server.once("error", () => {
        port += 1;
        tryListen();
      });
      server.listen(port, "0.0.0.0", () => {
        server.close(() => resolve(port));
      });
    };

    tryListen();
  });
}

async function main() {
  if (mode !== "dev" && mode !== "build") {
    fail(
      `用法: node scripts/run-project.mjs <dev|build> <project>\n示例: pnpm dev asset`
    );
  }

  if (!project || project.startsWith("-")) {
    const yamlPath = join(root, "builder.projects.yaml");
    let hint = "";
    if (existsSync(yamlPath)) {
      const raw = readFileSync(yamlPath, "utf8");
      const map = parseYaml(raw);
      if (map && typeof map === "object") {
        hint = `\n已在 builder.projects.yaml 登记的项目：${Object.keys(map).join(", ")}`;
      }
    }
    fail(`请指定项目名，例如：pnpm ${mode} asset${hint}`);
  }

  const yamlPath = join(root, "builder.projects.yaml");
  if (!existsSync(yamlPath)) {
    fail(`缺少配置文件：${yamlPath}`);
  }

  const projectsMap = parseYaml(readFileSync(yamlPath, "utf8"));
  if (!projectsMap || typeof projectsMap !== "object") {
    fail(
      `${yamlPath} 格式错误：应为「项目名: { title, baseUrl }」的映射（title、baseUrl 均为必填）`
    );
  }

  if (!(project in projectsMap)) {
    fail(
      `项目 "${project}" 未在 builder.projects.yaml 中登记。\n可选项目：${Object.keys(projectsMap).join(", ")}`
    );
  }

  const { title, baseUrl, logoSlug } = normalizeProjectConfig(
    projectsMap[project],
    project,
    mode
  );

  const entryFile = join(root, "src", `${project}.ts`);
  if (!existsSync(entryFile)) {
    fail(`入口文件不存在：src/${project}.ts`);
  }

  const platformPath = join(root, "public", "platform-config.json");
  if (!existsSync(platformPath)) {
    fail(`缺少 ${platformPath}，请先保留默认 platform-config.json`);
  }

  let logoPath = null;
  if (logoSlug) {
    const pkgs = readPnpmWorkspacePackages(root);
    logoPath = resolveLogoPath(logoSlug, pkgs, project);
  }

  /** 不写磁盘：dev 由 Vite 中间件注入 Title；build 由插件写入 dist */
  const env = {
    ...process.env,
    VITE_APP_SYSTEM: project,
    VITE_APP_TITLE: title.trim(),
    /** 每项目在 YAML 中显式配置，覆盖 .env 中的默认值 */
    VITE_BASE_URL: baseUrl
  };
  if (logoPath) {
    env.VITE_APP_LOGO_PATH = logoPath;
  }

  if (mode === "dev") {
    const start = readDevStartPort(root);
    try {
      const port = await findFreePort(start);
      env.VITE_PORT = String(port);
      const logoHint = logoPath
        ? `，logo：${relative(root, logoPath).replace(/\\/g, "/")}`
        : "";
      console.log(
        `[owl-ui-builder] ${project} → http://localhost:${port}/  （标题：${title.trim()}，API：${baseUrl}${logoHint}）`
      );
    } catch (e) {
      fail(e.message || String(e));
    }
  }

  const viteCli = join(root, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteCli)) {
    fail("未找到 vite，请先在该目录执行 pnpm install");
  }

  if (mode === "build") {
    const dist = join(root, "dist");
    try {
      rmSync(dist, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }

  const viteArgs = mode === "build" ? [viteCli, "build"] : [viteCli];

  const result = spawnSync(process.execPath, viteArgs, {
    cwd: root,
    env,
    stdio: "inherit"
  });

  process.exit(result.status ?? 1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
