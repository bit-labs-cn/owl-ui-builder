import { fsAllow } from "./bootstrap";
export const debugServer = (VITE_BASE_URL: string, VITE_PORT: number) => {

  return {
    port: VITE_PORT,
    host: "0.0.0.0",
    fs: {
      allow: fsAllow
    },
    proxy: {
      "/api": {
        target: VITE_BASE_URL,
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, "/api/")
      }
    }
  }
}