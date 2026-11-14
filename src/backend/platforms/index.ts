import type { PlatformAdapter } from "../../shared/types";
import { genericAdapter } from "./generic";
import { xAdapter } from "./x";

const adapters: PlatformAdapter[] = [xAdapter];

/** Site-specific adapter when one exists, otherwise the generic any-site adapter. */
export function getPlatform(hostname = location.hostname): PlatformAdapter {
  const host = hostname.replace(/^www\./, "");
  return adapters.find((a) => a.hosts.includes(host)) ?? genericAdapter;
}
