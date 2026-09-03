import { useEffect, useMemo, useState } from 'react';
import { Alert, Segmented, Space, Spin, Typography } from 'antd';
import { ApiError, getChemicalSpaceEmbedding, getKMeansClusters, getSomGrid } from '../api';
import { CATEGORICAL_COLORS, MAX_CATEGORICAL_SERIES } from '../categoricalPalette';
import type { Molecule, SomGridPoint, SpacePoint } from '../types';
import { MoleculeStructure } from './MoleculeStructure';

const { Text } = Typography;

type Layout = 'descriptor' | 'pca' | 'som';
type ColorBy = 'druglike' | 'cluster';

const KMEANS_K = MAX_CATEGORICAL_SERIES;

// Fixed status pair (see dataviz palette: good/critical), mode-invariant —
// same hex in light and dark. Red/green alone fails CVD separation (deutan
// ΔE 4.1) — shape carries identity too, color only reinforces it. Muted to
// sit with the app's calm teal/terracotta-adjacent palette rather than
// stock saturated red/green.
const COLOR_DRUGLIKE = '#3E8E6E';
const COLOR_NOT_DRUGLIKE = '#C1584B';
const MUTED = '#8A9198';

// Chart chrome, light/dark pair (see dataviz palette.md) — selected by the
// `dark` prop, not by prefers-color-scheme, since it must follow the app's
// own light/dark toggle rather than the OS setting. Kept close to the app's
// surface/border/text-secondary tokens (theme.tsx) so the chart reads as
// part of the same design system instead of a separately-styled widget.
const CHROME = {
  light: { surface: '#ffffff', grid: '#eef1f3', axis: '#c7ccd1', secondary: '#5b6670' },
  dark: { surface: '#1c2226', grid: '#2b3339', axis: '#3a434a', secondary: '#93a0a8' },
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

function diamondPath(cx: number, cy: number, r: number): string {
  const h = r * 1.3;
  return `M ${cx} ${cy - h} L ${cx + h} ${cy} L ${cx} ${cy + h} L ${cx - h} ${cy} Z`;
}

// Deterministic pseudo-random offset in [-0.35, 0.35), seeded by a string —
// used to fan out molecules that share the same SOM unit into a small
// cluster instead of stacking into a single indistinguishable dot. Stable
// across re-renders since it's a pure function of the molecule id, not
// Math.random().
function jitter(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (((h % 1000) + 1000) % 1000) / 1000 - 0.5;
}

interface Point {
  molecule: Molecule;
  x: number;
  y: number;
}

export function ChemicalSpaceChart({ molecules, dark }: { molecules: Molecule[]; dark: boolean }) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout>('descriptor');
  const [colorBy, setColorBy] = useState<ColorBy>('druglike');

  const [embedding, setEmbedding] = useState<{ points: SpacePoint[]; explainedVariance: number[] } | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedError, setEmbedError] = useState<string | null>(null);

  const [som, setSom] = useState<{ points: SomGridPoint[]; gridSize: number } | null>(null);
  const [somLoading, setSomLoading] = useState(false);
  const [somError, setSomError] = useState<string | null>(null);

  const [clusters, setClusters] = useState<Map<string, number> | null>(null);
  const [clusterLoading, setClusterLoading] = useState(false);
  const [clusterError, setClusterError] = useState<string | null>(null);

  const { surface: SURFACE, grid: GRID, axis: AXIS, secondary: SECONDARY } = CHROME[dark ? 'dark' : 'light'];
  const clusterColors = CATEGORICAL_COLORS[dark ? 'dark' : 'light'];

  useEffect(() => {
    if (layout !== 'pca' || embedding || embedLoading) return;
    setEmbedLoading(true);
    setEmbedError(null);
    getChemicalSpaceEmbedding()
      .then((res) => setEmbedding({ points: res.points, explainedVariance: res.explained_variance }))
      .catch((err) => setEmbedError(err instanceof ApiError ? err.message : 'Failed to compute embedding'))
      .finally(() => setEmbedLoading(false));
  }, [layout, embedding, embedLoading]);

  useEffect(() => {
    if (layout !== 'som' || som || somLoading) return;
    setSomLoading(true);
    setSomError(null);
    getSomGrid()
      .then((res) => setSom({ points: res.points, gridSize: res.grid_size }))
      .catch((err) => setSomError(err instanceof ApiError ? err.message : 'Failed to train the SOM'))
      .finally(() => setSomLoading(false));
  }, [layout, som, somLoading]);

  useEffect(() => {
    if (colorBy !== 'cluster' || clusters || clusterLoading) return;
    setClusterLoading(true);
    setClusterError(null);
    getKMeansClusters(KMEANS_K)
      .then((res) =>
        setClusters(
          new Map(
            res.points
              .filter((p): p is typeof p & { cluster: number } => p.ok && p.cluster !== undefined)
              .map((p) => [String(p.id), p.cluster]),
          ),
        ),
      )
      .catch((err) => setClusterError(err instanceof ApiError ? err.message : 'Failed to cluster molecules'))
      .finally(() => setClusterLoading(false));
  }, [colorBy, clusters, clusterLoading]);

  // Keyed by String(id) on both sides — the backend sends numeric ids over
  // JSON, but Molecule.id is typed string, so a bare `m.id` key would never
  // match `String(p.id)` from the embedding/cluster/SOM responses.
  const moleculeById = useMemo(() => new Map(molecules.map((m) => [String(m.id), m])), [molecules]);

  const descriptorPoints: Point[] = molecules
    .filter((m): m is Molecule & { mw: number; logp: number } => m.mw !== null && m.logp !== null)
    .map((m) => ({ molecule: m, x: m.logp, y: m.mw }));

  const pcaPoints: Point[] = (embedding?.points ?? [])
    .filter((p): p is SpacePoint & { x: number; y: number } => p.ok && p.x !== undefined && p.y !== undefined)
    .map((p) => ({ molecule: moleculeById.get(String(p.id)), x: p.x, y: p.y }))
    .filter((p): p is Point => p.molecule !== undefined);

  const somPoints: Point[] = (som?.points ?? [])
    .flatMap((p) => {
      if (!p.ok || p.x === undefined || p.y === undefined) return [];
      const molecule = moleculeById.get(String(p.id));
      if (!molecule) return [];
      return [{ molecule, x: p.x + jitter(`${molecule.id}x`), y: p.y + jitter(`${molecule.id}y`) }];
    });

  const points = layout === 'pca' ? pcaPoints : layout === 'som' ? somPoints : descriptorPoints;

  if (layout === 'descriptor' && points.length === 0) {
    return <Text type="secondary">No molecules with computed descriptors yet.</Text>;
  }

  const layoutLoading = layout === 'pca' ? embedLoading : layout === 'som' ? somLoading : false;
  const layoutError = layout === 'pca' ? embedError : layout === 'som' ? somError : null;

  const xValues = points.map((p) => p.x);
  const yValues = points.map((p) => p.y);
  // The physicochemical axes each have a natural floor (LogP straddles 0,
  // MW can't go below it); the PCA/SOM axes don't, so pad symmetrically
  // instead of anchoring to zero.
  const xMin = layout === 'descriptor' ? Math.min(0, ...(xValues.length ? xValues : [0])) : Math.min(...(xValues.length ? xValues : [-1]));
  const xMax = Math.max(...(xValues.length ? xValues : [1]));
  const yMinRaw = Math.min(...(yValues.length ? yValues : [-1]));
  const yMax = Math.max(...(yValues.length ? yValues : [1]));

  const xPad = layout === 'som' ? 0.6 : (xMax - xMin) * 0.12 || 1;
  const yPad = layout === 'som' ? 0.6 : (yMax - (layout === 'descriptor' ? 0 : yMinRaw)) * 0.12 || 1;
  const xDomain: [number, number] = [xMin - xPad, xMax + xPad];
  const yDomain: [number, number] = layout === 'descriptor' ? [0, yMax + yPad] : [yMinRaw - yPad, yMax + yPad];

  const xScale = (v: number) => MARGIN.left + ((v - xDomain[0]) / (xDomain[1] - xDomain[0])) * PLOT_W;
  const yScale = (v: number) => MARGIN.top + PLOT_H - ((v - yDomain[0]) / (yDomain[1] - yDomain[0])) * PLOT_H;

  // SOM units are discrete grid cells, not a continuous scale — integer
  // ticks at each unit rather than niceTicks' arbitrary step size.
  const xTicks = layout === 'som' && som ? Array.from({ length: som.gridSize }, (_, i) => i) : niceTicks(xDomain[0], xDomain[1]);
  const yTicks = layout === 'som' && som ? Array.from({ length: som.gridSize }, (_, i) => i) : niceTicks(yDomain[0], yDomain[1]);

  const hovered = points.find((p) => p.molecule.id === hoverId) ?? null;
  const druglikeCount = points.filter((p) => p.molecule.druglike).length;

  const xLabel =
    layout === 'descriptor'
      ? 'LogP'
      : layout === 'pca'
        ? `PC1${embedding ? ` (${Math.round(embedding.explainedVariance[0] * 100)}% var)` : ''}`
        : 'SOM unit (column)';
  const yLabel =
    layout === 'descriptor'
      ? 'Molecular weight'
      : layout === 'pca'
        ? `PC2${embedding ? ` (${Math.round((embedding.explainedVariance[1] ?? 0) * 100)}% var)` : ''}`
        : 'SOM unit (row)';
  const ariaLabel =
    layout === 'descriptor'
      ? 'Scatter plot of LogP versus molecular weight'
      : layout === 'pca'
        ? "Scatter plot of a two-component PCA projection of each molecule's fingerprint"
        : "Self-organizing map placing each molecule's fingerprint on a grid";

  const clusterFor = (molecule: Molecule): number | null => {
    if (colorBy !== 'cluster' || !clusters) return null;
    const c = clusters.get(String(molecule.id));
    return c === undefined ? null : c;
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Segmented
          value={layout}
          onChange={(v) => setLayout(v as Layout)}
          options={[
            { label: 'Physicochemical (LogP × MW)', value: 'descriptor' },
            { label: 'Structural (fingerprint PCA)', value: 'pca' },
            { label: 'Structural (SOM grid)', value: 'som' },
          ]}
        />
        <Segmented
          value={colorBy}
          onChange={(v) => setColorBy(v as ColorBy)}
          options={[
            { label: 'Color: drug-likeness', value: 'druglike' },
            { label: `Color: K-Means cluster (k=${KMEANS_K})`, value: 'cluster' },
          ]}
        />
      </Space>

      {layoutError && <Alert type="warning" message={layoutError} style={{ marginBottom: 12, maxWidth: WIDTH }} />}
      {layoutLoading && (
        <div style={{ marginBottom: 12 }}>
          <Spin size="small" />{' '}
          <Text type="secondary">{layout === 'pca' ? 'Computing PCA projection of fingerprints…' : 'Training the self-organizing map…'}</Text>
        </div>
      )}
      {colorBy === 'cluster' && clusterError && (
        <Alert type="warning" message={clusterError} style={{ marginBottom: 12, maxWidth: WIDTH }} />
      )}
      {colorBy === 'cluster' && clusterLoading && (
        <div style={{ marginBottom: 12 }}>
          <Spin size="small" /> <Text type="secondary">Running K-Means over fingerprints…</Text>
        </div>
      )}

      {points.length === 0 ? (
        layout !== 'descriptor' && !layoutLoading && !layoutError ? (
          <Text type="secondary">
            Need at least 2 molecules to {layout === 'pca' ? 'compute a structural embedding' : 'train a SOM'}.
          </Text>
        ) : null
      ) : (
        <div style={{ position: 'relative', maxWidth: WIDTH }}>
          <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" role="img" aria-label={ariaLabel}>
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
              {xLabel}
            </text>
            <text
              x={14}
              y={MARGIN.top + PLOT_H / 2}
              textAnchor="middle"
              fontSize={12}
              fill={SECONDARY}
              transform={`rotate(-90 14 ${MARGIN.top + PLOT_H / 2})`}
            >
              {yLabel}
            </text>

            {points.map(({ molecule, x, y }) => {
              const cx = xScale(x);
              const cy = yScale(y);
              const isHovered = molecule.id === hoverId;
              const r = isHovered ? 6 : 5;
              const cluster = clusterFor(molecule);

              const color = cluster !== null ? clusterColors[cluster % clusterColors.length] : molecule.druglike ? COLOR_DRUGLIKE : COLOR_NOT_DRUGLIKE;
              // Cluster identity gets its own shape per slot too (circle /
              // triangle / diamond) so it isn't carried by color alone.
              const shape =
                cluster !== null
                  ? cluster % 3 === 0
                    ? null
                    : cluster % 3 === 1
                      ? trianglePath(cx, cy, r)
                      : diamondPath(cx, cy, r)
                  : molecule.druglike
                    ? null
                    : trianglePath(cx, cy, r);

              return (
                <g
                  key={molecule.id}
                  onMouseEnter={() => setHoverId(molecule.id)}
                  onMouseLeave={() => setHoverId((id) => (id === molecule.id ? null : id))}
                  style={{ cursor: 'pointer' }}
                >
                  <circle cx={cx} cy={cy} r={12} fill="transparent" />
                  {shape ? (
                    <path d={shape} fill={color} stroke={SURFACE} strokeWidth={2} />
                  ) : (
                    <circle cx={cx} cy={cy} r={r} fill={color} stroke={SURFACE} strokeWidth={2} />
                  )}
                </g>
              );
            })}
          </svg>

          {hovered && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(xScale(hovered.x) + 14, WIDTH - 220),
                top: Math.max(yScale(hovered.y) - 10, 0),
                background: '#0b0b0b',
                color: '#ffffff',
                padding: '8px 10px',
                borderRadius: 6,
                fontSize: 12,
                lineHeight: 1.5,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                zIndex: 10,
              }}
            >
              <MoleculeStructure smiles={hovered.molecule.smiles} width={130} height={80} />
              <div style={{ fontFamily: 'monospace', marginTop: 6 }}>{hovered.molecule.smiles}</div>
              <div>
                MW {hovered.molecule.mw} · LogP {hovered.molecule.logp}
              </div>
              <div>{hovered.molecule.druglike ? 'Drug-like' : 'Not drug-like'}</div>
              {clusterFor(hovered.molecule) !== null && <div>Cluster {(clusterFor(hovered.molecule) as number) + 1}</div>}
            </div>
          )}
        </div>
      )}

      {colorBy === 'cluster' && clusters ? (
        <Space size={20} wrap style={{ marginTop: 12 }}>
          {Array.from({ length: KMEANS_K }, (_, i) => i).map((c) => (
            <Space key={c} size={6}>
              <svg width={14} height={14} aria-hidden="true">
                {c % 3 === 0 ? (
                  <circle cx={7} cy={7} r={5} fill={clusterColors[c % clusterColors.length]} />
                ) : c % 3 === 1 ? (
                  <path d={trianglePath(7, 7, 5)} fill={clusterColors[c % clusterColors.length]} />
                ) : (
                  <path d={diamondPath(7, 7, 5)} fill={clusterColors[c % clusterColors.length]} />
                )}
              </svg>
              <Text type="secondary">
                Cluster {c + 1} (n={points.filter((p) => clusterFor(p.molecule) === c).length})
              </Text>
            </Space>
          ))}
        </Space>
      ) : (
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
      )}
    </div>
  );
}
