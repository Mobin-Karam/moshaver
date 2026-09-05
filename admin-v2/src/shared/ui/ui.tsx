import { LoaderCircle } from "lucide-react";
import { ComponentProps, ReactNode, forwardRef } from "react";
import { cn } from "../lib/utils";

type ButtonProps = ComponentProps<"button"> & {
  variant?: "primary" | "soft" | "danger" | "ghost";
  loading?: boolean;
  loadingLabel?: string;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
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
          h-10
          items-center
          justify-center

          gap-2

          rounded-xl

          px-4

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

          className,
        )}
        {...props}
      >
        {loading ? (
          <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
        ) : null}

        {loading && loadingLabel ? loadingLabel : children}
      </button>
    );
  },
);

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

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  ComponentProps<"textarea">
>(function Textarea(props, ref) {
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


focus:border-brand


focus:ring-4

focus:ring-brand/10


dark:placeholder:text-slate-500


`,

        props.className,
      )}
    />
  );
});

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

  action,
}: {
  title: string;

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
      {title}

      {action}
    </div>
  );
}

export function LoadingState({
  label = "در حال دریافت...",
}: {
  label?: string;
}) {
  return (
    <div
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

export function Field({
  label,

  children,

  error,
}: {
  label: string;

  children: ReactNode;

  error?: string;
}) {
  return (
    <label
      className="

grid

gap-2


text-sm


font-medium


text-[rgb(var(--color-ink))]

"
    >
      <span>{label}</span>

      {children}

      {error && (
        <span
          className="

text-xs

font-medium

text-rosewood

"
        >
          {error}
        </span>
      )}
    </label>
  );
}
