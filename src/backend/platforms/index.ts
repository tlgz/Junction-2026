import type { PlatformAdapter } from "../../shared/types";
import { xAdapter } from "./x";

const adapters: PlatformAdapter[] = [xAdapter];

export function getPlatform(hostname = location.hostname): PlatformAdapter | null {
  const host = hostname.replace(/^www\./, "");
  return adapters.find((a) => a.hosts.includes(host)) ?? null;
}
