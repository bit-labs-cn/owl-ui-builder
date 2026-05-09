/**
 * 固定入口：实际子应用由 Vite 插件 virtual:project-entry 按 VITE_APP_SYSTEM 注入。
 */
import { loadProjectEntry } from "virtual:project-entry";

void loadProjectEntry();
