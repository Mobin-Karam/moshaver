export const CMB_MODULE_KINDS: readonly ["kernel", "foundation", "platform", "adapter", "product"];
export type CmbModuleKind = (typeof CMB_MODULE_KINDS)[number];

export type CmbModuleDescriptor = Readonly<{
  id: string;
  version: string;
  kind: CmbModuleKind;
  dependencies: readonly string[];
}>;

export function defineModule(input: {
  id: string;
  version: string;
  kind: CmbModuleKind;
  dependencies?: Iterable<string>;
}): CmbModuleDescriptor;

export function createToken(scope: string, name: string): symbol;
