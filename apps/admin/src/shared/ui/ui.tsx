import { LoaderCircle } from "lucide-react";
import {
  ComponentProps,
  Children,
  ReactElement,
  ReactNode,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
} from "react";
import { cn } from "../lib/utils";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "soft" | "danger" | "ghost";
  size?: "sm" | "md" | "icon";
  loading?: boolean;
  loadingLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant = "primary",
    size = "md",
    loading = false,
    loadingLabel,
    children,
    disabled,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        `
          inline-flex
          h-11
          items-center
          justify-center

          gap-2

          rounded-xl

          px-[1.125rem]

          text-sm
          font-semibold

          transition-all
          duration-200

          active:scale-[0.98]

          disabled:pointer-events-none
          disabled:cursor-not-allowed
          disabled:opacity-50

          focus-visible:outline-none
          focus-visible:ring-4
          focus-visible:ring-brand/20
          motion-reduce:transition-none
          motion-reduce:active:scale-100
          `,

        variant === "primary" &&
          `
            bg-brand
            text-white

            shadow-sm

            hover:brightness-95
            hover:shadow-md
            `,

        variant === "soft" &&
          `
            border
            border-[rgb(var(--border-subtle))]

            bg-[rgb(var(--surface-card))]

            text-[rgb(var(--color-ink))]

            hover:bg-brand/5
            hover:border-brand/30

            dark:bg-slate-900
            `,

        variant === "danger" &&
          `
            bg-rosewood
            text-white

            hover:brightness-95
            hover:shadow-md
            `,

        variant === "ghost" &&
          `
            text-slate-600

            hover:bg-slate-100

            dark:text-slate-300
            dark:hover:bg-slate-800
            `,

        size === "sm" && "h-9 rounded-lg px-3 text-xs",
        size === "icon" && "size-10 h-10 rounded-lg p-0",

        className,
      )}
      {...props}
    >
      {loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : null}

      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
});

Button.displayName = "Button";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        `
        rounded-2xl

        border

        border-[rgb(var(--border-subtle))]

        bg-[rgb(var(--surface-card))]

        shadow-sm

        transition-all
        duration-200

        `,

        className,
      )}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, ComponentProps<"input">>(
  function Input(props, ref) {
    return (
      <input
        ref={ref}
        {...props}
        className={cn(
          `

h-11

w-full

rounded-xl


border

border-[rgb(var(--border-subtle))]


bg-[rgb(var(--surface-card))]


px-4


text-sm


text-[rgb(var(--color-ink))]


outline-none


transition-all


placeholder:text-slate-400


hover:border-brand/40

disabled:cursor-not-allowed disabled:opacity-60

read-only:bg-[rgb(var(--surface-muted))] read-only:text-slate-500

aria-[invalid=true]:border-rosewood aria-[invalid=true]:ring-rosewood/10


focus:border-brand

focus:ring-4

focus:ring-brand/10


dark:placeholder:text-slate-500


`,

          props.className,
        )}
      />
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, ComponentProps<"textarea">>(
  function Textarea(props, ref) {
    return (
      <textarea
        ref={ref}
        {...props}
        className={cn(
          `

min-h-28

w-full


rounded-xl


border

border-[rgb(var(--border-subtle))]


bg-[rgb(var(--surface-card))]


px-4

py-3


text-sm


text-[rgb(var(--color-ink))]


outline-none


transition-all


placeholder:text-slate-400


hover:border-brand/40

disabled:cursor-not-allowed disabled:opacity-60

read-only:bg-[rgb(var(--surface-muted))] read-only:text-slate-500

aria-[invalid=true]:border-rosewood aria-[invalid=true]:ring-rosewood/10


focus:border-brand


focus:ring-4

focus:ring-brand/10


dark:placeholder:text-slate-500


`,

          props.className,
        )}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, ComponentProps<"select">>(
  function Select(props, ref) {
    return (
      <select
        ref={ref}
        {...props}
        className={cn(
          `

h-11


w-full


rounded-xl


border


border-[rgb(var(--border-subtle))]


bg-[rgb(var(--surface-card))]


px-4


text-sm


text-[rgb(var(--color-ink))]


outline-none


transition-all


hover:border-brand/40

disabled:cursor-not-allowed disabled:opacity-60

aria-[invalid=true]:border-rosewood aria-[invalid=true]:ring-rosewood/10


focus:border-brand


focus:ring-4


focus:ring-brand/10


`,

          props.className,
        )}
      />
    );
  },
);

export function Badge({
  children,

  tone = "neutral",
}: {
  children: ReactNode;

  tone?: "neutral" | "green" | "amber" | "red" | "blue";
}) {
  return (
    <span
      className={cn(
        `

inline-flex

items-center

rounded-full


px-3

py-1


text-xs


font-semibold


transition


`,

        tone === "neutral" &&
          `

bg-slate-100

text-slate-700

dark:bg-slate-800

dark:text-slate-300

`,

        tone === "green" &&
          `

bg-emerald-500/10

text-emerald-600

dark:text-emerald-400

`,

        tone === "amber" &&
          `

bg-amber-500/10

text-amber-600

dark:text-amber-400

`,

        tone === "red" &&
          `

bg-rose-500/10

text-rose-600

dark:text-rose-400

`,

        tone === "blue" &&
          `

bg-blue-500/10

text-blue-600

dark:text-blue-400

`,
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className="

flex

min-h-40

flex-col

items-center

justify-center


gap-4


rounded-2xl


border

border-dashed

border-[rgb(var(--border-subtle))]


bg-[rgb(var(--surface-muted))]


p-6


text-center


text-sm

text-slate-500


dark:text-slate-400

"
    >
      <strong className="text-ink">{title}</strong>

      {description ? <p className="max-w-xl text-xs leading-5">{description}</p> : null}

      {action}
    </div>
  );
}

export function LoadingState({ label = "در حال دریافت..." }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="

animate-pulse


rounded-2xl


border

border-[rgb(var(--border-subtle))]


bg-[rgb(var(--surface-card))]


p-5


text-sm


text-slate-500


dark:text-slate-400

"
    >
      {label}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-6 text-center text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/20 dark:text-rose-200"
    >
      <strong>{title}</strong>
      {description ? <p className="max-w-xl text-xs leading-5">{description}</p> : null}
      {action}
    </div>
  );
}

export function Field({
  label,
  children,
  description,
  error,
  required = false,
  id,
}: {
  label: string;
  children: ReactNode;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  id?: string;
}) {
  const generatedId = useId();
  const fieldId = id || `field-${generatedId}`;
  const descriptionId = `${fieldId}-description`;
  const errorId = `${fieldId}-error`;
  const describedBy =
    [description ? descriptionId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined;
  type ControlProps = {
    id?: string;
    required?: boolean;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  };
  const target = findFieldControl(children);
  const element = target as ReactElement<ControlProps> | null;
  const controlId = element ? element.props.id || fieldId : undefined;
  const control = element
    ? enhanceFieldControl(children, element, {
        id: controlId,
        required: element.props.required ?? required,
        "aria-describedby": element.props["aria-describedby"] || describedBy,
        "aria-invalid": element.props["aria-invalid"] ?? (error ? true : undefined),
      })
    : children;
  const labelContent = (
    <>
      {label}
      {required ? (
        <span className="mr-1 text-rosewood" aria-hidden="true">
          *
        </span>
      ) : null}
    </>
  );
  return (
    <div
      className="

grid

gap-2


text-sm


font-medium


text-[rgb(var(--color-ink))]

"
    >
      {controlId ? <label htmlFor={controlId}>{labelContent}</label> : <span>{labelContent}</span>}

      {control}

      {description ? (
        <span id={descriptionId} className="text-xs font-normal text-slate-500 dark:text-slate-400">
          {description}
        </span>
      ) : null}

      {error && (
        <span
          id={errorId}
          role="alert"
          className="

text-xs

font-medium

text-rosewood

"
        >
          {error}
        </span>
      )}
    </div>
  );
}

function isFieldControl(element: ReactElement) {
  return (
    (typeof element.type === "string" && ["input", "textarea", "select"].includes(element.type)) ||
    element.type === Input ||
    element.type === Textarea ||
    element.type === Select
  );
}

function findFieldControl(node: ReactNode): ReactElement | null {
  let result: ReactElement | null = null;
  Children.forEach(node, (child) => {
    if (result || !isValidElement(child)) return;
    if (isFieldControl(child)) {
      result = child;
      return;
    }
    result = findFieldControl((child.props as { children?: ReactNode }).children);
  });
  return result;
}

function enhanceFieldControl(
  node: ReactNode,
  target: ReactElement,
  props: Record<string, unknown>,
): ReactNode {
  return Children.map(node, (child) => {
    if (!isValidElement(child)) return child;
    if (child === target) return cloneElement(child, props);
    const nested = (child.props as { children?: ReactNode }).children;
    return nested === undefined
      ? child
      : cloneElement(child, {}, enhanceFieldControl(nested, target, props));
  });
}
