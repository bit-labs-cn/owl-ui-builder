import { fsAllow } from "./bootstrap";
export const debugServer = (VITE_PORT: number) => {

  return {
    port: VITE_PORT,
    host: "0.0.0.0",
    fs: {
      allow: fsAllow
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080/",
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, "/api/")
      }
    }
  }
}