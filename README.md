# owl-ui-builder

多子系统聚合调试入口：按「项目」选择 `src/<项目>.ts`，自动写入标题到 `public/platform-config.json` 与页面 `<title>`，无需再改 `index.html`。

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

示例：

```bash
pnpm dev asset
pnpm dev lift-vision
```

- `<project>` 对应入口文件 `src/<project>.ts`
- 标题从根目录 `builder.projects.yaml` 读取，并写入 `public/platform-config.json` 的 `Title` 字段
- `pnpm dev` / `pnpm build` 会在启动前重写 `src/generated-entry.ts`，只对当前项目做静态 `import()`，避免构建时解析其它入口（例如缺少可选 workspace 包时牵连失败）。仓库内默认提交为 `asset`；本地切换项目后若不想提交该文件变动，可执行 `git checkout -- src/generated-entry.ts` 还原。

## 编译（生产构建）

```bash
pnpm build <project>
```

示例：`pnpm build asset`

会先清空 `dist`，再执行 `vite build`。

## 预览构建产物

```bash
pnpm preview
```

（需先完成一次 `pnpm build <project>`）

## 新增一个子系统启动入口

1. **新增入口文件**  
   在 `src/` 下新建 `src/<project>.ts`，内部按现有文件写法调用 `createFlexAdmin({ subsystems: [...] })`。

2. **登记标题**  
   在 `builder.projects.yaml` 增加一行：

   ```yaml
   <project>: 你的平台标题
   ```

   项目名含连字符时可直接写 `lift-vision: xxx`，勿使用中文弯引号作为 key。

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
- 每次 `dev` / `build` 会按当前项目覆盖 `public/platform-config.json` 中的 `Title`，其它字段保留不变。
