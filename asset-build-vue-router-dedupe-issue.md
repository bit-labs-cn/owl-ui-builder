# asset 打包后点击设计报 `push` undefined 问题复盘

## 背景

`owl-ui-builder` 作为多子系统聚合构建入口，通过 `src/asset.ts` 挂载以下子系统：

- `@bit-labs.cn/owl-admin-ui`
- `@bit-labs.cn/asset-manage-ui`
- `@bit-labs.cn/owl-inspection-ui`
- `@bit-labs.cn/owl-workorder-ui`

本次问题出现在 `asset` 项目构建部署到服务端后，进入工单相关的“流程模板”和“表单模板”页面，点击“设计”按钮时报错：

```text
TypeError: Cannot read properties of undefined (reading 'push')
```

开发环境正常，生产打包部署后异常。

## 问题现象

浏览器控制台报错示例：

```text
asset-KFIPzmMh.js:14 TypeError: Cannot read properties of undefined (reading 'push')
    at P (index-DDxXP52L.js:1:2348)
    at onClick (index-DDxXP52L.js:1:4496)
```

从构建产物反查 `index-DDxXP52L.js`，对应源码为 `owl-workorder` 的表单模板列表页：

```ts
const router = useRouter();

function openDesigner(row) {
  router.push({
    path: "/workorder/template-designer/designer",
    query: { id: String(row.id) }
  });
}
```

报错中的 `push` 并不是数组方法，而是 `router.push`。也就是说，生产环境下 `useRouter()` 返回了 `undefined`。

## 根因分析

根因是生产构建产物中出现了两份 `vue-router`。

构建前的异常产物中可以看到：

- 主入口 `asset-*.js` 内部包含一份 `vue-router`
- 页面 chunk 又单独生成并引用了 `vue-router-*.js`

主应用执行：

```ts
app.use(router);
```

时，注入的是主入口那份 `vue-router` 的 router key。

但“流程模板/表单模板”页面 chunk 中的：

```ts
useRouter()
```

来自另一份单独打包出来的 `vue-router-*.js`。两份 `vue-router` 的注入 key 不是同一个 Symbol，因此页面侧无法拿到主应用注入的 router 实例，最终 `useRouter()` 得到 `undefined`，点击按钮时执行 `undefined.push(...)` 报错。

开发环境正常，是因为 dev server 的依赖预构建和模块解析方式与生产 Rollup 构建不同，开发时没有触发这类重复实例问题。

## 修复方案

在 `owl-ui-builder/vite.config.ts` 中增加依赖去重：

```ts
resolve: {
  dedupe: ["vue", "vue-router"],
  alias: {
    ...alias
  }
}
```

同时在 `owl-ui-builder/package.json` 中显式增加宿主依赖：

```json
"vue-router": "^4.6.4"
```

原因是 `resolve.dedupe` 会要求从宿主项目根部解析依赖。如果宿主根没有直接依赖 `vue-router`，生产构建会报：

```text
Rollup failed to resolve import "vue-router"
```

因此需要让 `owl-ui-builder` 自身也显式声明 `vue-router`。

## 关联修复

排查过程中还发现 `owl-ui` 的子系统路由注入逻辑存在一个潜在问题：

```ts
router.options.routes[0].children.push(v);
```

这段代码假设 `router.options.routes[0]` 一定是 `/` 根布局路由。开发环境或当前顺序下可能成立，但生产打包后路由顺序不应被依赖。

已调整为按 `path === "/"` 查找根路由，并确保 `children` 存在：

```ts
function getRootRoute() {
  return router.options.routes.find(route => route.path === "/");
}

function getRootChildren() {
  const rootRoute = getRootRoute();
  if (!rootRoute) return [];
  return rootRoute.children ?? (rootRoute.children = []);
}
```

这不是本次 `useRouter()` 为 `undefined` 的直接根因，但建议保留，避免后续出现路由注入顺序相关的问题。

## 验证结果

执行：

```bash
pnpm build asset
```

构建通过。

新产物检查结果：

- 不再生成单独的 `vue-router-*.js`
- “流程模板/表单模板”页面 chunk 从主入口 `asset-*.js` 导入 `useRouter`
- 页面和主应用使用同一份 `vue-router` 实例

因此 `useRouter()` 可以正常获取到 `app.use(router)` 注入的 router 实例，点击“设计”时 `router.push(...)` 不再是 undefined。

## 部署注意事项

部署时需要确认服务端使用的是最新构建产物：

```bash
pnpm build asset
```

然后部署最新的 `dist`。

如果浏览器控制台仍然看到旧文件名，例如：

```text
asset-KFIPzmMh.js
index-DDxXP52L.js
```

说明服务端或浏览器仍在使用旧包，需要检查：

- 服务端部署目录是否已被最新 `dist` 覆盖
- Nginx/CDN 是否缓存了旧静态资源
- 浏览器是否命中了旧缓存
- HTML 入口文件是否已经更新到引用新的 hash 文件

修复后的新构建产物文件名会发生变化，例如：

```text
asset-DQHK4ZDF.js
```

实际以本次构建输出为准。

## 结论

本问题本质是 monorepo/workspace 多子系统聚合构建时，Vue 生态单例依赖没有被统一解析，导致生产包内存在多份 `vue-router`。对于 `vue`、`vue-router` 这类依赖注入强相关的库，必须保证宿主和所有子系统使用同一份实例。

最终修复点：

- `owl-ui-builder` 中通过 `resolve.dedupe` 去重 `vue` 和 `vue-router`
- `owl-ui-builder` 显式声明 `vue-router` 依赖
- `owl-ui` 路由注入逻辑改为按根路由 path 查找，避免依赖数组顺序
