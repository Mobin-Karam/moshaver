export const CMB_MODULE_KINDS: readonly ["kernel", "foundation", "platform", "adapter", "product"];
export type CmbModuleKind = (typeof CMB_MODULE_KINDS)[number];

export type CmbModuleDescriptor = Readonly<{
  id: string;
  version: string;
  kind: CmbModuleKind;
  dependencies: readonly string[];
  optionalDependencies?: readonly string[];
  provides?: readonly string[];
  requires?: readonly string[];
  routes?: readonly string[];
  migrations?: readonly string[];
  health?: readonly string[];
  permissions?: readonly string[];
  events?: Readonly<{ publishes: readonly string[]; subscribes: readonly string[] }>;
  configuration?: Readonly<Record<string, unknown>>;
}>;

export type CmbModuleRegistration<TContext = unknown> = Readonly<{
  descriptor: CmbModuleDescriptor;
  start?: (context: TContext) => void | Promise<void>;
  stop?: (context: TContext) => void | Promise<void>;
}>;

export const KERNEL_MODULE: CmbModuleDescriptor;

export class CmbModuleRegistry<TContext = unknown> {
  constructor(registrations?: Iterable<CmbModuleDescriptor | CmbModuleRegistration<TContext>>);
  register(registration: CmbModuleDescriptor | CmbModuleRegistration<TContext>): this;
  resolve(enabledIds?: Iterable<string>): readonly CmbModuleRegistration<TContext>[];
  metadata(enabledIds?: Iterable<string>): readonly CmbModuleDescriptor[];
  start(context?: TContext, enabledIds?: Iterable<string>): Promise<readonly CmbModuleDescriptor[]>;
  stop(context?: TContext): Promise<void>;
}

export function defineModule(input: {
  id: string;
  version: string;
  kind: CmbModuleKind;
  dependencies?: Iterable<string>;
  optionalDependencies?: Iterable<string>;
  provides?: Iterable<string>;
  requires?: Iterable<string>;
  routes?: Iterable<string>;
  migrations?: Iterable<string>;
  health?: Iterable<string>;
  permissions?: Iterable<string>;
  publishes?: Iterable<string>;
  subscribes?: Iterable<string>;
  configuration?: Record<string, unknown>;
}): CmbModuleDescriptor;

export function createToken(scope: string, name: string): symbol;
