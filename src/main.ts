/**
 * 固定入口：实际子应用由 scripts/run-project.mjs 写入的 generated-entry 决定。
 */
import { loadProjectEntry } from "./generated-entry";

void loadProjectEntry();
