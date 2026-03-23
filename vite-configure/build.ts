import { pathResolve } from "@bit-labs.cn/owl-ui/build-preset";

export const build = () => {
  console.log("meta.url", import.meta.url);
  const mainHtml = pathResolve("../index.html", import.meta.url);
  const assetHtml = pathResolve("../asset.html", import.meta.url);
  console.log("输入文件:", { mainHtml, assetHtml });
  return {
    target: "es2015",
    sourcemap: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      input: {
        main: mainHtml,
        asset: assetHtml
      },
      output: {
        chunkFileNames: "static/js/[name]-[hash].js",
        entryFileNames: "static/js/[name]-[hash].js",
        assetFileNames: "static/[ext]/[name]-[hash].[ext]"
      }
    }
  }
};