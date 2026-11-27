import { useEffect, useId, useMemo, useState } from "react";
import { normalizeCouncil } from "../data/councils";
import {
  loadStudents,
  loadStudentsFromFirestore,
} from "../lib/students";

const YEAR_ORDER = ["1ST YEAR", "2ND YEAR", "3RD YEAR", "4TH YEAR"];

const CHART = {
  width: 760,
  height: 360,
  left: 54,
  right: 26,
  top: 28,
  bottom: 56,
};

function yearBucket(value) {
  const text = String(value == null ? "" : value).trim().toUpperCase();
  if (!text) return "UNSPECIFIED";
  if (/\b1(ST)?\b|FIRST/.test(text)) return "1ST YEAR";
  if (/\b2(ND)?\b|SECOND/.test(text)) return "2ND YEAR";
  if (/\b3(RD)?\b|THIRD/.test(text)) return "3RD YEAR";
  if (/\b4(TH)?\b|FOURTH/.test(text)) return "4TH YEAR";
  return "OTHER";
}

function smoothPath(points) {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const t = 0.18;

    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;

    path += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

function EnrollmentChart({ points, total }) {
  const [activePoint, setActivePoint] = useState(null);
  const gradientId = useId().replace(/[:]/g, "");
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const peak = Math.max(...points.map((point) => point.value), 0);
  const step = Math.max(1, Math.ceil(Math.max(peak, 1) / 4));
  const top = step * 4;
  const ticks = [0, 1, 2, 3, 4].map((index) => index * step);
  const xFor = (index) =>
    CHART.left +
    (points.length === 1 ? plotWidth / 2 : (plotWidth * index) / (points.length - 1));
  const yFor = (value) =>
    CHART.top + plotHeight - (plotHeight * value) / (top || 1);

  const plotted = points.map((point, index) => ({
    ...point,
    x: xFor(index),
    y: yFor(point.value),
  }));
  const line = smoothPath(plotted);
  const area = `${line} L ${plotted[plotted.length - 1].x} ${
    CHART.top + plotHeight
  } L ${plotted[0].x} ${CHART.top + plotHeight} Z`;
  const highest = points.reduce(
    (best, point, index) => (point.value > best.value ? { ...point, index } : best),
    { value: -1, index: -1 }
  );

  return (
    <svg
      className="enroll-chart"
      viewBox={`0 0 ${CHART.width} ${CHART.height}`}
      role="img"
      aria-label={`Enrollment by year level. ${points
        .map((point) => `${point.label}: ${point.value}`)
        .join(", ")}. ${total} students total.`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--green-500, #1f8a5f)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--green-500, #1f8a5f)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {ticks.map((tick) => (
        <g key={tick}>
          <line
            x1={CHART.left}
            x2={CHART.width - CHART.right}
            y1={yFor(tick)}
            y2={yFor(tick)}
            className="enroll-chart__grid"
          />
          <text
            x={CHART.left - 14}
            y={yFor(tick)}
            className="enroll-chart__tick"
            textAnchor="end"
            dominantBaseline="middle"
          >
            {tick}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} className="enroll-chart__line" />

      {plotted.map((point) => {
        const isHighest = point.index === highest.index && point.value > 0;
        return (
          <g
            key={point.label}
            className="enroll-node"
            tabIndex={0}
            onMouseEnter={() => setActivePoint(point)}
            onMouseLeave={() => setActivePoint(null)}
            onFocus={() => setActivePoint(point)}
            onBlur={() => setActivePoint(null)}
          >
            <circle
              cx={point.x}
              cy={point.y}
              r="22"
              className="enroll-node__hit"
            />
            <circle
              cx={point.x}
              cy={point.y}
              r={isHighest ? 7 : 5}
              className={`enroll-chart__dot${isHighest ? " is-peak" : ""}`}
            >
              <title>
                {point.label}: {point.value} student{point.value === 1 ? "" : "s"}
              </title>
            </circle>
            <text
              x={point.x}
              y={point.y - (isHighest ? 16 : 13)}
              className={`enroll-chart__value${isHighest ? " is-peak" : ""}`}
              textAnchor="middle"
            >
              {point.value}
            </text>
            <text
              x={point.x}
              y={CHART.height - CHART.bottom + 26}
              className="enroll-chart__label"
              textAnchor="middle"
            >
              {point.label}
            </text>
          </g>
        );
      })}

      {activePoint ? (
        <g pointerEvents="none">
          <rect
            x={Math.max(72, Math.min(CHART.width - 72, activePoint.x)) - 64}
            y={Math.max(activePoint.y - 66, 8)}
            width="128"
            height="46"
            rx="9"
            className="enroll-tip"
          />
          <text
            x={Math.max(72, Math.min(CHART.width - 72, activePoint.x))}
            y={Math.max(activePoint.y - 66, 8) + 18}
            textAnchor="middle"
            className="enroll-tip__year"
          >
            {activePoint.label}
          </text>
          <text
            x={Math.max(72, Math.min(CHART.width - 72, activePoint.x))}
            y={Math.max(activePoint.y - 66, 8) + 35}
            textAnchor="middle"
            className="enroll-tip__count"
          >
            {activePoint.value} student{activePoint.value === 1 ? "" : "s"}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export default function AnalyticsPanel({ council }) {
  const activeCouncil = normalizeCouncil(council);
  const [students, setStudents] = useState(() => loadStudents(activeCouncil));
  const [status, setStatus] = useState(activeCouncil ? "loading" : "no-council");

  useEffect(() => {
    let active = true;

    if (!activeCouncil) {
      setStudents([]);
      setStatus("no-council");
      return () => {
        active = false;
      };
    }

    setStudents(loadStudents(activeCouncil));
    setStatus("loading");

    loadStudentsFromFirestore(activeCouncil)
      .then((remote) => {
        if (!active) return;
        const local = loadStudents(activeCouncil);
        const byId = new Map();
        local.forEach((student) => byId.set(student.studentId, student));
        remote.forEach((student) => byId.set(student.studentId, student));
        setStudents(Array.from(byId.values()));
        setStatus("ready");
      })
      .catch((error) => {
        if (!active) return;
        console.warn("[analytics] Firebase load failed:", error);
        setStatus("local");
      });

    return () => {
      active = false;
    };
  }, [activeCouncil]);

  const totals = useMemo(() => {
    const counts = Object.fromEntries(YEAR_ORDER.map((year) => [year, 0]));
    let other = 0;

    students.forEach((student) => {
      const bucket = yearBucket(student.year);
      if (counts[bucket] == null) other += 1;
      else counts[bucket] += 1;
    });

    const points = YEAR_ORDER.map((label) => ({
      label,
      value: counts[label],
    }));

    if (other > 0) points.push({ label: "OTHER", value: other });

    const total = points.reduce((sum, point) => sum + point.value, 0);
    const highest = points.reduce(
      (best, point) => (point.value > best.value ? point : best),
      points[0]
    );
    const average = points.length
      ? Math.round((total / points.length) * 10) / 10
      : 0;

    return { points, total, highest, average };
  }, [students]);

  return (
    <section className="dash-view analytics-view" aria-label="Analytics">
      <div className="view-head">
        <div>
          <h1>Analytics</h1>
          <p className="view-subtitle">
            Enrollment by year level{activeCouncil ? ` · ${activeCouncil}` : ""}
          </p>
        </div>
        <span className="dash-count">{totals.total} students</span>
      </div>

      <div className="stat-grid">
        <article className="stat-card">
          <span className="stat-card__label">Total students</span>
          <strong>{totals.total}</strong>
          <small>Across every year level</small>
        </article>
        <article className="stat-card stat-card--accent">
          <span className="stat-card__label">Highest enrollment</span>
          <strong>{totals.highest.value > 0 ? totals.highest.label : "—"}</strong>
          <small>
            {totals.highest.value > 0
              ? `${totals.highest.value} student${
                  totals.highest.value === 1 ? "" : "s"
                }`
              : "No records yet"}
          </small>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Average per year</span>
          <strong>{totals.average}</strong>
          <small>Students per year level</small>
        </article>
      </div>

      <article className="chart-card">
        <header className="chart-card__head">
          <div>
            <h2>Students per year level</h2>
            <p>
              {status === "no-council"
                ? "Your account has no Council/Organization assigned."
                : status === "local"
                ? "Showing records saved in this browser (Firebase unavailable)."
                : status === "loading"
                ? "Loading your roster…"
                : `Live roster for ${activeCouncil}`}
            </p>
          </div>
          <span className="chart-legend">
            <i aria-hidden="true" />
            Enrolled students
          </span>
        </header>

        {totals.total > 0 ? (
          <EnrollmentChart points={totals.points} total={totals.total} />
        ) : (
          <div className="chart-empty">
            <p>No enrollment data yet.</p>
            <small>
              Import a student list in the Students tab to plot the chart.
            </small>
          </div>
        )}
      </article>
    </section>
  );
}
