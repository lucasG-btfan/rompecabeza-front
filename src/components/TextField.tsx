import { forwardRef, type InputHTMLAttributes } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-soft">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          className="rounded-md border-2 border-ink/10 bg-tile-light px-3 py-2 text-ink placeholder:text-ink-soft/50 outline-none transition-colors focus:border-amber focus-visible:ring-2 focus-visible:ring-amber/40"
          {...props}
        />
        {error && <p className="text-sm text-coral">{error}</p>}
      </div>
    );
  }
);

TextField.displayName = "TextField";
