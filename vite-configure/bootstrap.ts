import {
    pathResolve,
    getWorkspacePackages,
    createWorkspaceAlias,
  } from "@bit-labs.cn/owl-ui/build-preset";

const root = process.cwd();
const workspacePackages = getWorkspacePackages({
  workspaceFilePath: pathResolve("../pnpm-workspace.yaml", import.meta.url),
  onlyExternal: true
});
const alias = createWorkspaceAlias(workspacePackages);

console.log("Vite Resolve Alias:", alias)

const fsAllow = [root, ...workspacePackages.map(item => item.dir)]

console.log("根目录:", root)
console.log("工作空间包：", workspacePackages);
console.log("vite允许访问的目录：", fsAllow)

export { root, workspacePackages, alias, fsAllow }