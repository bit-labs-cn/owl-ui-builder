
import { type UserConfigExport, type ConfigEnv, loadEnv } from "vite";
import {
  wrapperEnv,
  defaultOptimizeInclude,
  defaultOptimizeExclude,
} from "@bit-labs.cn/owl-ui/build-preset";

import { debugServer } from "./vite-configure/server";
import {root, alias} from "./vite-configure/bootstrap";
import { build } from "./vite-configure/build";
import { plugins } from "./vite-configure/plugins";

export default async ({ mode }: ConfigEnv): Promise<UserConfigExport> => {
 
  const { VITE_PORT, VITE_COMPRESSION, VITE_PUBLIC_PATH, VITE_BASE_URL} = wrapperEnv(
    loadEnv(mode, root)
  );

  return {
    base: VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias: {
        ...alias,
      }
    },

    plugins: plugins(VITE_COMPRESSION),
    optimizeDeps: {
      include: defaultOptimizeInclude,
      exclude: defaultOptimizeExclude
    },
    server: debugServer(VITE_BASE_URL, VITE_PORT),
    build: build()
  }
};
