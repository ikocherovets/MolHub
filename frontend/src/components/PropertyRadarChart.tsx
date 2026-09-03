import { Space, Typography } from 'antd';
import { CATEGORICAL_COLORS, MAX_CATEGORICAL_SERIES } from '../categoricalPalette';
import type { Molecule } from '../types';

const { Text } = Typography;

// Every polygon overlaps every other one on the same plot, so this needs the
// all-pairs-validated categorical palette (see categoricalPalette.ts) — that's
// also why comparison is capped at 3 molecules, the palette's all-pairs limit.
export const MAX_COMPARE = MAX_CATEGORICAL_SERIES;

interface Axis {
  key: keyof Pick<Molecule, 'mw' | 'logp' | 'tpsa' | 'h_donors' | 'h_acceptors' | 'ring_count'>;
  label: string;
  max: number;
  min: number;
  format: (v: number) => string;
}

// Fixed, scientifically-meaningful bounds (roughly the Lipinski/Veber
// "drug-like" envelope) rather than normalizing each axis to the min/max of
// whatever's selected — so the shape means the same thing molecule to
// molecule, and a hexagon that stays inside the outer ring reads as
// "inside typical drug-like bounds."
const AXES: Axis[] = [
  { key: 'mw', label: 'MW (≤500)', max: 500, min: 0, format: (v) => v.toFixed(0) },
  { key: 'logp', label: 'LogP (≤5)', max: 5, min: -2, format: (v) => v.toFixed(2) },
  { key: 'tpsa', label: 'TPSA (≤140)', max: 140, min: 0, format: (v) => v.toFixed(0) },
  { key: 'h_acceptors', label: 'HBA (≤10)', max: 10, min: 0, format: (v) => v.toFixed(0) },
  { key: 'h_donors', label: 'HBD (≤5)', max: 5, min: 0, format: (v) => v.toFixed(0) },
  { key: 'ring_count', label: 'Rings (≤6)', max: 6, min: 0, format: (v) => v.toFixed(0) },
];

const SIZE = 340;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 56;
const RINGS = [0.25, 0.5, 0.75, 1];

function axisPoint(index: number, fraction: number): [number, number] {
  const angle = (Math.PI * 2 * index) / AXES.length - Math.PI / 2;
  return [CENTER + Math.cos(angle) * RADIUS * fraction, CENTER + Math.sin(angle) * RADIUS * fraction];
}

function normalize(axis: Axis, value: number): number {
  return Math.min(1, Math.max(0, (value - axis.min) / (axis.max - axis.min)));
}

interface PropertyRadarChartProps {
  molecules: Molecule[];
  dark: boolean;
}

export function PropertyRadarChart({ molecules, dark }: PropertyRadarChartProps) {
  const colors = CATEGORICAL_COLORS[dark ? 'dark' : 'light'];
  const grid = dark ? '#3a434a' : '#c7ccd1';
  const muted = dark ? '#93a0a8' : '#5b6670';
  const selected = molecules.slice(0, MAX_COMPARE);

  return (
    <div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" style={{ maxWidth: SIZE }} role="img" aria-label="Radar chart comparing molecular properties">
        {RINGS.map((r) => (
          <polygon
            key={r}
            points={AXES.map((_, i) => axisPoint(i, r).join(',')).join(' ')}
            fill="none"
            stroke={grid}
            strokeWidth={1}
          />
        ))}

        {AXES.map((axis, i) => {
          const [x, y] = axisPoint(i, 1);
          return <line key={axis.key} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke={grid} strokeWidth={1} />;
        })}

        {AXES.map((axis, i) => {
          const [x, y] = axisPoint(i, 1.16);
          return (
            <text key={axis.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill={muted}>
              {axis.label}
            </text>
          );
        })}

        {selected.map((molecule, seriesIndex) => {
          const color = colors[seriesIndex];
          const vertices = AXES.map((axis, i) => {
            const raw = molecule[axis.key];
            const fraction = raw === null ? 0 : normalize(axis, raw);
            return { point: axisPoint(i, fraction), raw, axis };
          });
          const path = vertices.map((v) => v.point.join(',')).join(' ');
          return (
            <g key={molecule.id}>
              <polygon points={path} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={2} />
              {vertices.map(({ point, raw, axis }) => (
                <circle key={axis.key} cx={point[0]} cy={point[1]} r={4} fill={color} stroke={dark ? '#1c2226' : '#fff'} strokeWidth={1.5}>
                  <title>
                    {molecule.smiles} — {axis.label.split(' ')[0]}: {raw === null ? 'n/a' : axis.format(raw)}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      <Space size={16} wrap style={{ marginTop: 8 }}>
        {selected.map((molecule, i) => (
          <Space key={molecule.id} size={6}>
            <svg width={12} height={12} aria-hidden="true">
              <rect width={12} height={12} rx={2} fill={colors[i]} />
            </svg>
            <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: 12 }}>
              {molecule.smiles}
            </Text>
          </Space>
        ))}
      </Space>
    </div>
  );
}
