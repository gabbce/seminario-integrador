import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";

export function Pending({ name }: { name: string }) {
  const go = useNavigate();
  return (
    <section className="panel pending">
      <p className="eyebrow">PRÓXIMAS ENTREGAS</p>
      <h1>{name.charAt(0).toUpperCase() + name.slice(1)}</h1>
      <p>Esta sección todavía no forma parte del corte navegable.</p>
      <p className="muted">
        Ya podés recorrer la agenda, consultar reservas y registrar una reserva
        periódica.
      </p>
      <Button onClick={() => go("/agenda")}>Ir a la agenda</Button>
    </section>
  );
}
