import { useEffect, useRef } from "react";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from "chart.js";
import type { dayMetrics } from "../metrics";
Chart.register(
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
);
export function MetricCurve({
  slots,
  metric,
  title,
}: {
  slots: ReturnType<typeof dayMetrics>["slots"];
  metric: "students" | "classes";
  title: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = new Chart(ref.current, {
      type: "line",
      data: {
        labels: [...slots.map((s) => s.start), "23:00"],
        datasets: [
          {
            label: title,
            data: [...slots.map((s) => s[metric]), 0],
            borderColor: "#185340",
            backgroundColor: "#18534012",
            fill: true,
            stepped: "before",
            pointRadius: 0,
            pointHitRadius: 12,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: "index", intersect: false },
        scales: {
          x: {
            grid: { display: false },
            ticks: { maxTicksLimit: 5, maxRotation: 0 },
          },
          y: {
            beginAtZero: true,
            ticks: { precision: 0 },
            title: {
              display: true,
              text: metric === "students" ? "Alumnos previstos" : "Clases",
            },
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              title: (items) => {
                const s = slots[items[0].dataIndex];
                return s ? `${s.start}–${s.end}` : "Cierre · 23:00";
              },
            },
          },
        },
      },
    });
    return () => chart.destroy();
  }, [slots, metric, title]);
  const max = Math.max(...slots.map((s) => s[metric]));
  return (
    <section className="panel metric-curve">
      <div className="metric-curve-heading">
        <h2>{title}</h2>
        <p>
          <strong>Pico: {max}</strong>
          {max > 0 && (
            <span>
              {" "}
              ·{" "}
              {slots
                .filter((s) => s[metric] === max)
                .map((s) => `${s.start}–${s.end}`)
                .join(", ")}
            </span>
          )}
        </p>
      </div>
      <div className="metric-canvas">
        <canvas
          ref={ref}
          role="img"
          aria-label={`${title}. Pico ${max}. Valores por franja en la tabla inferior.`}
        />
      </div>
    </section>
  );
}
