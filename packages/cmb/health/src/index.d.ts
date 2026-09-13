import type { CmbModuleDescriptor } from "@moshaver/cmb-kernel";

export const HEALTH_MODULE: CmbModuleDescriptor;

export type ReadinessProbe = Readonly<{
  name: string;
  check: () => void | Promise<void>;
}>;

export class ReadinessError extends Error {
  readonly probe: string;
  readonly cause: unknown;
  constructor(probe: string, cause: unknown);
}

export class CmbHealthService {
  constructor(options: { serviceName: string; probes?: readonly ReadinessProbe[] });
  health(): { service: string; status: "ok" };
  ready(): Promise<Record<string, "ready">>;
}
