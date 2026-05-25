# owl-ui-builder

多子系统聚合调试入口：按「项目」选择 `src/<项目>.ts`，在 **不写磁盘** 的情况下为每个 dev/build 进程注入平台标题（页面 `<title>` 与运行时读取的 `platform-config.json`），并支持 **多个项目同时 `pnpm dev`**。

## 环境

- Node `^18.18.0 || ^20.9.0 || >=22.0.0`
- pnpm `>=9`

在仓库根目录安装依赖：

```bash
pnpm install
```

## 运行（开发）

```bash
pnpm dev <project>
```

示例（可同时开多个终端分别运行，互不抢占端口与配置）：

```bash
pnpm dev asset
pnpm dev lift-vision
```

- `<project>` 对应入口文件 `src/<project>.ts`
- 标题与后端地址均来自根目录 `builder.projects.yaml`（见下文对象格式），分别注入 `VITE_APP_TITLE`、`VITE_BASE_URL`；**不会**改写仓库里的 `public/platform-config.json`
- **端口**：从 `.env.development` 中的 `VITE_PORT` 起始，若已被占用则自动递增尝试空闲端口（控制台会打印实际地址）

## 编译（生产构建）

```bash
pnpm build <project>
```

示例：`pnpm build asset`

会先清空 `dist`，再执行 `vite build`。产物中的 `platform-config.json` 会按当前项目合并写入 `Title`（以 `public/platform-config.json` 为模板）。

## 预览构建产物

```bash
pnpm preview
```

（需先完成一次 `pnpm build <project>`）

## 新增一个子系统启动入口

1. **新增入口文件**  
   在 `src/` 下新建 `src/<project>.ts`，内部按现有文件写法调用 `createFlexAdmin({ subsystems: [...] })`。

2. **在 builder.projects.yaml 登记完整配置**  
   每个项目**必须**为对象，且 **`title`、`baseUrl` 均为必填**（不允许再使用「一行字符串只写标题」的简写）。

   ```yaml
   # 字符串简写：dev / build 共用同一个 baseUrl
   <project>:
     title: 你的平台标题
     baseUrl: http://192.168.0.13:8080/

   # 对象形式：dev 走绝对地址做代理，build 走相对路径（推荐）
   <project>:
     title: 你的平台标题
     baseUrl:
       dev: http://127.0.0.1:8080/
       build: /
   ```

   - `baseUrl`：该项目的后端根地址，会注入为当前进程的 `VITE_BASE_URL`（开发时决定 `/api`、`/storage` 代理指向；构建时作为 axios `baseURL` 打入产物）。
     - **字符串**：dev 与 build 共用同一个值（旧语义）。
     - **对象 `{ dev, build }`**：分别用于 `pnpm dev <project>` 与 `pnpm build <project>`；当前命令对应键缺失时会报错。`build` 兼容 `prod` / `production` 别名，`dev` 兼容 `development` 别名。
   - 字符串简写下，字段别名 `base_url`、`VITE_BASE_URL`、`viteBaseUrl` 仍然可用。
   - 末尾斜杠可有可无，脚本会规范为以 `/` 结尾。
   - 项目名含连字符时写 `lift-vision:` 即可，勿使用中文弯引号作为 key。
   - **注意**：`.env.development` / `.env.production` 里的 `VITE_BASE_URL` 已不再生效（会被本 YAML 覆盖），YAML 是唯一来源。只有绕过包装脚本的旁路命令（`pnpm dev:edge`、`pnpm build:staging`）才会用到 `.env.{development,staging}` 里的值。

3. **依赖与子应用包**  
   若需引入新的 workspace UI 包：
   - 在 `pnpm-workspace.yaml` 中加入对应包路径（若尚未加入）
   - 在本目录 `package.json` 的 `devDependencies` 中增加 `"@bit-labs.cn/xxx-ui": "workspace:*"`（或你们仓库约定的包名）

4. **启动验证**

   ```bash
   pnpm dev <project>
   ```

## 其它脚本

- `pnpm dev:edge`：打开 `edge.html` 的 Vite 直连调试（不经项目包装脚本）
- `pnpm build:staging`：按 `staging` mode 构建（不经项目包装脚本）

## 说明

- `pnpm dev` / `pnpm build` **必须**带项目名；缺少或非法时会提示可用项目（来自 `builder.projects.yaml`）。
- 技术实现：`virtual:project-entry`（见 `vite-configure/project-plugin.ts`）保证每个进程只打包当前项目的入口；开发态通过中间件按进程返回不同的 `platform-config.json` 内容。
- 若直接运行 `vite` 而不经过 `pnpm dev <project>`，将缺少 `VITE_APP_SYSTEM`，入口会报错提示使用包装命令。
