import { useEffect, useId, useRef, useState } from "react";

type ErrorField = { id: string; label: string };
/** Focus the summary and provide keyboard access to the relevant controls. */
export function FormError({
  message,
  fields = [],
}: {
  message: string;
  fields?: ErrorField[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  const [hasForm, setHasForm] = useState(false);
  useEffect(() => {
    ref.current?.focus();
    const form = ref.current?.closest("form");
    setHasForm(
      !!form?.querySelector(
        "input:not(:disabled):not([readonly]),select:not(:disabled),textarea:not(:disabled)",
      ),
    );
    let timer: ReturnType<typeof setTimeout>;
    const focusAgain = () => {
      timer = setTimeout(() => ref.current?.focus(), 0);
    };
    form?.addEventListener("submit", focusAgain);
    return () => {
      clearTimeout(timer);
      form?.removeEventListener("submit", focusAgain);
    };
  }, [message]);
  function visit(field?: ErrorField) {
    const control = field
      ? document.getElementById(field.id)
      : ref.current
          ?.closest("form")
          ?.querySelector<HTMLElement>(
            'input:not([type="hidden"]):not(:disabled):not([readonly]),select:not(:disabled),textarea:not(:disabled)',
          );
    if (!control) return;
    control.scrollIntoView({ block: "center" });
    control.focus();
  }
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="error form-error"
      aria-describedby={id}
    >
      <p id={id}>{message}</p>
      {fields.length
        ? fields.map((field) => (
            <button
              type="button"
              className="error-field-link"
              key={field.id}
              onClick={() => visit(field)}
            >
              Revisar {field.label}
            </button>
          ))
        : hasForm && (
            <button
              type="button"
              className="error-field-link"
              onClick={() => visit()}
            >
              Revisar formulario
            </button>
          )}
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message: string }) {
  return message ? (
    <span id={id} className="field-error" aria-hidden="true">
      {message}
    </span>
  ) : null;
}
