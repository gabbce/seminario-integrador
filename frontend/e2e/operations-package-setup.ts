import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
// This config performs writes only against the explicitly created local disposable package.
export function verifyPackage(scenario: "operations" | "exact") {
  const data = JSON.parse(
    readFileSync("../artifacts/qa/exact-package/environment.json", "utf8"),
  );
  if (
    data.scenario !== scenario ||
    data.origin !== "http://127.0.0.1:5176" ||
    !/^[a-f0-9]{64}$/.test(data.appContainerId) ||
    !/^[a-f0-9]{64}$/.test(data.databaseContainerId)
  )
    throw Error(
      `Iniciar node tools/qa/exact-package-env.mjs${scenario === "operations" ? " --operations" : ""}. No se acepta otro destino.`,
    );
  const [container, database] = JSON.parse(
    execFileSync(
      "docker",
      ["inspect", data.appContainerId, data.databaseContainerId],
      {
        encoding: "utf8",
      },
    ),
  );
  if (
    !container.Config.Env.includes(
      "SPRING_DATASOURCE_URL=jdbc:postgresql://aulas-qa-exact-package-db:5432/aulas_qa_exact",
    ) ||
    !container.State.Running ||
    container.Image !== data.imageId ||
    !database.State.Running ||
    database.Name !== "/aulas-qa-exact-package-db" ||
    database.Config.Labels?.["aulas.qa"] !== "exact-package" ||
    !Object.values(container.NetworkSettings.Networks).some((network) =>
      Object.values(database.NetworkSettings.Networks).some(
        (other) =>
          (network as { NetworkID: string }).NetworkID ===
          (other as { NetworkID: string }).NetworkID,
      ),
    ) ||
    container.NetworkSettings.Ports["8080/tcp"]?.[0]?.HostIp !== "127.0.0.1" ||
    container.Config.Labels?.["aulas.qa"] !== "exact-package" ||
    container.NetworkSettings.Ports["8080/tcp"]?.[0]?.HostPort !== "5176"
  )
    throw Error("El contenedor aislado esperado no está activo en5176.");
}

export default function setup() {
  verifyPackage("operations");
  const data = JSON.parse(
    readFileSync("../artifacts/qa/exact-package/environment.json", "utf8"),
  );
  const count = execFileSync(
    "docker",
    [
      "exec",
      data.databaseContainerId,
      "psql",
      "-X",
      "-At",
      "-U",
      "qa",
      "-d",
      "aulas_qa_exact",
      "-c",
      "select count(*) from aulas.reserva",
    ],
    { encoding: "utf8" },
  ).trim();
  if (count !== "20")
    throw Error(
      "La base de operaciones ya fue usada. Detener el entorno y crear uno nuevo para cada navegador.",
    );
}
