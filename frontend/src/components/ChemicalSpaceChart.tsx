import { useState } from 'react';
import { Space, Typography } from 'antd';
import type { Molecule } from '../types';

const { Text } = Typography;

// Fixed status pair (see dataviz palette: good/critical), mode-invariant —
// same hex in light and dark. Red/green alone fails CVD separation (deutan
// ΔE 4.1) — shape carries identity too, color only reinforces it.
const COLOR_DRUGLIKE = '#0ca30c';
const COLOR_NOT_DRUGLIKE = '#d03b3b';
const MUTED = '#898781';

// Chart chrome, light/dark pair (see dataviz palette.md) — selected by the
// `dark` prop, not by prefers-color-scheme, since it must follow the app's
// own light/dark toggle rather than the OS setting.
const CHROME = {
  light: { surface: '#fcfcfb', grid: '#e1e0d9', axis: '#c3c2b7', secondary: '#52514e' },
  dark: { surface: '#1a1a19', grid: '#2c2c2a', axis: '#383835', secondary: '#c3c2b7' },
};

const WIDTH = 640;
const HEIGHT = 380;
const MARGIN = { top: 16, right: 16, bottom: 44, left: 56 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function niceTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual > 5 ? 10 : residual > 2 ? 5 : residual > 1 ? 2 : 1) * magnitude;
  const start = Math.ceil(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + step * 1e-6; t += step) ticks.push(Math.round(t / step) * step);
  return ticks;
}

function trianglePath(cx: number, cy: number, r: number): string {
  const h = r * 1.3;
  return `M ${cx} ${cy - h} L ${cx + h} ${cy + h * 0.75} L ${cx - h} ${cy + h * 0.75} Z`;
}

interface Point {
  molecule: Molecule;
  x: number;
  y: number;
}

export function ChemicalSpaceChart({ molecules, dark }: { molecules: Molecule[]; dark: boolean }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const { surface: SURFACE, grid: GRID, axis: AXIS, secondary: SECONDARY } = CHROME[dark ? 'dark' : 'light'];

  const points: Point[] = molecules
    .filter((m): m is Molecule & { mw: number; logp: number } => m.mw !== null && m.logp !== null)
    .map((m) => ({ molecule: m, x: m.logp, y: m.mw }));

  if (points.length === 0) {
    return <Text type="secondary">No molecules with computed descriptors yet.</Text>;
  }

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  const xMin = Math.min(0, ...xValues);
  const xMax = Math.max(...xValues);
  const yMax = Math.max(...yValues);

  const xPad = (xMax - xMin) * 0.12 || 1;
  const yPad = yMax * 0.12 || 1;
  const xDomain: [number, number] = [xMin - xPad, xMax + xPad];
  const yDomain: [number, number] = [0, yMax + yPad];

  const xScale = (v: number) => MARGIN.left + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * PLOT_W;
  const yScale = (v: number) => MARGIN.top + PLOT_H - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * PLOT_H;

  const xTicks = niceTicks(xDomain[0], xDomain[1]);
  const yTicks = niceTicks(yDomain[0], yDomain[1]);

  const hovered = points.find((p) => p.molecule.id === hoverId) ?? null;
  const druglikeCount = points.filter((p) => p.molecule.druglike).length;

  return (
    <div>
      <div style={{ position: 'relative', maxWidth: WIDTH }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          width="100%"
          role="img"
          aria-label="Scatter plot of LogP versus molecular weight, colored by drug-likeness"
        >
          <rect x={0} y={0} width={WIDTH} height={HEIGHT} fill={SURFACE} />

          {yTicks.map((t) => (
            <line key={`gy-${t}`} x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={yScale(t)} y2={yScale(t)} stroke={GRID} strokeWidth={1} />
          ))}
          {xTicks.map((t) => (
            <line key={`gx-${t}`} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} x1={xScale(t)} x2={xScale(t)} stroke={GRID} strokeWidth={1} />
          ))}

          <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={HEIGHT - MARGIN.bottom} y2={HEIGHT - MARGIN.bottom} stroke={AXIS} strokeWidth={1} />
          <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={HEIGHT - MARGIN.bottom} stroke={AXIS} strokeWidth={1} />

          {xTicks.map((t) => (
            <text key={`xl-${t}`} x={xScale(t)} y={HEIGHT - MARGIN.bottom + 18} textAnchor="middle" fontSize={11} fill={MUTED}>
              {t}
            </text>
          ))}
          {yTicks.map((t) => (
            <text key={`yl-${t}`} x={MARGIN.left - 10} y={yScale(t) + 4} textAnchor="end" fontSize={11} fill={MUTED}>
              {t}
            </text>
          ))}

          <text x={MARGIN.left + PLOT_W / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={12} fill={SECONDARY}>
            LogP
          </text>
          <text
            x={14}
            y={MARGIN.top + PLOT_H / 2}
            textAnchor="middle"
            fontSize={12}
            fill={SECONDARY}
            transform={`rotate(-90 14 ${MARGIN.top + PLOT_H / 2})`}
          >
            Molecular weight
          </text>

          {points.map(({ molecule, x, y }) => {
            const cx = xScale(x);
            const cy = yScale(y);
            const color = molecule.druglike ? COLOR_DRUGLIKE : COLOR_NOT_DRUGLIKE;
            const isHovered = molecule.id === hoverId;
            const r = isHovered ? 6 : 5;
            return (
              <g
                key={molecule.id}
                onMouseEnter={() => setHoverId(molecule.id)}
                onMouseLeave={() => setHoverId((id) => (id === molecule.id ? null : id))}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={cx} cy={cy} r={12} fill="transparent" />
                {molecule.druglike ? (
                  <circle cx={cx} cy={cy} r={r} fill={color} stroke={SURFACE} strokeWidth={2} />
                ) : (
                  <path d={trianglePath(cx, cy, r)} fill={color} stroke={SURFACE} strokeWidth={2} />
                )}
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div
            style={{
              position: 'absolute',
              left: Math.min(xScale(hovered.x) + 14, WIDTH - 200),
              top: Math.max(yScale(hovered.y) - 10, 0),
              background: '#0b0b0b',
              color: '#ffffff',
              padding: '6px 10px',
              borderRadius: 6,
              fontSize: 12,
              lineHeight: 1.5,
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
              zIndex: 10,
            }}
          >
            <div style={{ fontFamily: 'monospace' }}>{hovered.molecule.smiles}</div>
            <div>
              MW {hovered.molecule.mw} · LogP {hovered.molecule.logp}
            </div>
            <div>{hovered.molecule.druglike ? 'Drug-like' : 'Not drug-like'}</div>
          </div>
        )}
      </div>

      <Space size={20} style={{ marginTop: 12 }}>
        <Space size={6}>
          <svg width={14} height={14} aria-hidden="true">
            <circle cx={7} cy={7} r={5} fill={COLOR_DRUGLIKE} />
          </svg>
          <Text type="secondary">Drug-like (n={druglikeCount})</Text>
        </Space>
        <Space size={6}>
          <svg width={14} height={14} aria-hidden="true">
            <path d={trianglePath(7, 7, 5)} fill={COLOR_NOT_DRUGLIKE} />
          </svg>
          <Text type="secondary">Not drug-like (n={points.length - druglikeCount})</Text>
        </Space>
      </Space>
    </div>
  );
}
