import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, type, ...props }, ref) => {
    const inputId = id ?? props.name;
    const esPassword = type === "password";
    const [mostrar, setMostrar] = useState(false);

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-ink-soft">
          {label}
        </label>

        <div className="relative">
          <input
            id={inputId}
            ref={ref}
            type={esPassword && mostrar ? "text" : type}
            className={`rounded-md border-2 border-ink/10 bg-tile-light px-3 py-2 text-ink placeholder:text-ink-soft/50 outline-none transition-colors focus:border-amber focus-visible:ring-2 focus-visible:ring-amber/40 ${
              esPassword ? "pr-10" : ""
            }`}
            {...props}
          />

          {esPassword && (
            <button
              type="button"
              aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={mostrar}
              onClick={() => setMostrar((m) => !m)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-ink-soft transition-colors hover:text-ink"
            >
              {mostrar ? (
                <FaRegEye className="h-5 w-5" aria-hidden="true" />
              ) : (
                <FaRegEyeSlash className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-coral">{error}</p>}
      </div>
    );
  },
);

TextField.displayName = "TextField";
