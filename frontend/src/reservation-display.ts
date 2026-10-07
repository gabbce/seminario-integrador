import { isDate } from "./date-input";
import { dateLabel } from "./domain";
import { resourceLabels } from "./equipment";

function resources(value: string): string[] {
  const text = value.trim().replace(/\.$/, "");
  if (text === "Sin requisitos") return [];
  const content = /^\{.*\}$|^\[.*\]$/.test(text) ? text.slice(1, -1) : text;
  return content
    .split(",")
    .map((item) => {
      const key = item.trim().replace(/^"(.*)"$/, "$1");
      return Object.hasOwn(resourceLabels, key)
        ? resourceLabels[key as keyof typeof resourceLabels]
        : key;
    })
    .filter(Boolean)
    .sort();
}

/** Format known header audit fields without modifying the stored event or other history. */
export function headerHistoryLabel(description: string): string {
  const prefix = "Datos compartidos: ";
  if (!description.startsWith(prefix)) return description;
  const changes = description
    .slice(prefix.length)
    .split("; ")
    .flatMap((part) => {
      const field =
        /^(curso|docente|alumnos|tipo|pizarrón|recursos) (.+?) → (.+)$/.exec(
          part,
        );
      if (!field) return [part];
      const [, name, before, after] = field;
      if (name === "recursos") {
        const oldResources = resources(before),
          newResources = resources(after);
        if (JSON.stringify(oldResources) === JSON.stringify(newResources))
          return [];
        return [
          `recursos ${oldResources.join(", ") || "Sin requisitos"} → ${newResources.join(", ") || "Sin requisitos"}`,
        ];
      }
      return before.trim() === after.trim() ? [] : [part];
    });
  return (
    prefix + (changes.join("; ") || "sin cambios en los valores registrados.")
  );
}

export function roomGroupLabel(label: string): string {
  const date = /^(\d{4}-\d{2}-\d{2})(?=\s)/.exec(label)?.[1];
  const readable =
    date && isDate(date) ? dateLabel(date) + label.slice(date.length) : label;
  return readable.replace(
    /\b((?:[01]\d|2[0-3]):[0-5]\d):[0-5]\d(?:\.\d+)?\b/g,
    "$1",
  );
}
