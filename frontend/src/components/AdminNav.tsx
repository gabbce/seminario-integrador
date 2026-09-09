import { NavLink } from "react-router-dom";
export function AdminNav() {
  return (
    <nav className="admin-tabs" aria-label="Secciones de administración">
      <NavLink to="/administracion" end>
        Cuentas
      </NavLink>
      <NavLink to="/administracion/calendario">Calendario académico</NavLink>
    </nav>
  );
}
