export type ReturnTypeOfUseModal = {
  confirm: (options: {
    title: string;
    description?: string;
    tone?:
      | "default"
      | "danger";
    confirmLabel?: string;
  }) => Promise<boolean>;
};
