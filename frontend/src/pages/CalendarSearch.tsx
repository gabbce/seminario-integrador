import { useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ui/button";
import { FormError } from "../components/FormError";
import type { PersistedCalendarConfig } from "./PersistedCalendar";

type Page = {
  items: PersistedCalendarConfig[];
  total: number;
  page: number;
  size: number;
};
type Terms = {
  year: number;
  state: string;
  items: { number: number; start: string; end: string }[];
};
const failure = (error: unknown) =>
  error instanceof Error ? error.message : "No se pudo completar la búsqueda.";

export function CalendarSearch({
  selected,
  open,
  revision,
}: {
  selected?: PersistedCalendarConfig;
  open: (calendar: PersistedCalendarConfig) => void;
  revision: number;
}) {
  const [year, setYear] = useState("");
  const [state, setState] = useState("");
  const [query, setQuery] = useState({ year: "", state: "", page: 0 });
  const [result, setResult] = useState<Page>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dates, setDates] = useState({ from: "", to: "" });
  const [terms, setTerms] = useState<Terms>();
  const [termsError, setTermsError] = useState("");
  const [termsBusy, setTermsBusy] = useState(false);
  const selectedId = selected?.id;
  const selectedVersion = selected?.version;
  useEffect(() => {
    let active = true;
    async function load() {
      setBusy(true);
      setError("");
      const params = new URLSearchParams({
        ...query,
        page: String(query.page),
        size: "20",
      });
      try {
        const value = await api<Page>(`/administracion/calendarios?${params}`);
        if (active) setResult(value);
      } catch (error) {
        if (active) setError(failure(error));
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [query, revision]);
  useEffect(() => {
    let active = true;
    async function load() {
      setTerms(undefined);
      setTermsError("");
      if (!selectedId) {
        setTermsBusy(false);
        return;
      }
      setTermsBusy(true);
      try {
        const value = await api<Terms>(
          `/administracion/calendarios/${selectedId}/cuatrimestres?${new URLSearchParams(dates)}`,
        );
        if (active) setTerms(value);
      } catch (error) {
        if (active) setTermsError(failure(error));
      } finally {
        if (active) setTermsBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [selectedId, selectedVersion, dates, revision]);
  return (
    <>
      <section className="panel" aria-label="Buscar años lectivos">
        <h2>Buscar años lectivos</h2>
        <form
          className="calendar-year-controls"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery({ year, state, page: 0 });
          }}
        >
          <label>
            Año a buscar
            <input
              type="number"
              min="1"
              max="9999"
              value={year}
              onChange={(e) => setYear(e.target.value)}
            />
          </label>
          <label>
            Estado a buscar
            <select value={state} onChange={(e) => setState(e.target.value)}>
              <option value="">Todos los estados</option>
              {["En preparación", "Habilitado", "Cerrado"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy}>
            Buscar años
          </Button>
        </form>
        {error && <FormError message={error} />}
        {busy ? (
          <p role="status">Buscando años…</p>
        ) : (
          !error &&
          result && (
            <>
              {result.items.length === 0 ? (
                <p role="status">Sin años coincidentes.</p>
              ) : (
                <ul>
                  {result.items.map((calendar) => (
                    <li key={calendar.id}>
                      <span>
                        {calendar.year} · {calendar.state}
                      </span>{" "}
                      <Button
                        variant="outline"
                        aria-label={`Abrir año ${calendar.year}`}
                        onClick={() => open(calendar)}
                      >
                        Abrir
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <p>
                Página {query.page + 1} · {result.total} años
              </p>
            </>
          )
        )}
        <Button
          variant="outline"
          aria-label="Página anterior"
          disabled={busy || query.page === 0}
          onClick={() => setQuery({ ...query, page: query.page - 1 })}
        >
          Anterior
        </Button>{" "}
        <Button
          variant="outline"
          aria-label="Página siguiente"
          disabled={
            busy || !result || (query.page + 1) * result.size >= result.total
          }
          onClick={() => setQuery({ ...query, page: query.page + 1 })}
        >
          Siguiente
        </Button>
      </section>
      {selected && (
        <section className="panel" aria-label="Buscar cuatrimestres">
          <h2>Buscar cuatrimestres</h2>
          <p>
            Año {selected.year} · Estado del año: {selected.state}
          </p>
          <p>
            Se muestran los períodos que coinciden con alguna fecha del rango,
            incluidos sus extremos.
          </p>
          <form
            className="calendar-year-controls"
            onSubmit={(event) => {
              event.preventDefault();
              if (from && to && from > to) {
                setTermsError(
                  "La fecha desde debe ser anterior o igual a hasta.",
                );
                return;
              }
              setDates({ from, to });
            }}
          >
            <label>
              Cuatrimestres desde
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Cuatrimestres hasta
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <Button type="submit" disabled={termsBusy}>
              Buscar cuatrimestres
            </Button>
          </form>
          {termsError && <FormError message={termsError} />}
          {termsBusy ? (
            <p role="status">Buscando cuatrimestres…</p>
          ) : (
            !termsError &&
            terms &&
            (terms.items.length ? (
              <ul>
                {terms.items.map((term) => (
                  <li key={term.number}>
                    <strong>Cuatrimestre {term.number}</strong> ·{" "}
                    {term.start || "Inicio pendiente"} —{" "}
                    {term.end || "Fin pendiente"}
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status">Sin cuatrimestres coincidentes.</p>
            ))
          )}
        </section>
      )}
    </>
  );
}
