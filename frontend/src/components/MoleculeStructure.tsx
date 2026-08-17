import { useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import { renderMolecule } from '../api';

// Many table rows/panels can render the same SMILES in one page — share one
// in-flight request per SMILES instead of re-fetching per row.
const svgCache = new Map<string, Promise<string>>();

function getSvg(smiles: string): Promise<string> {
  let cached = svgCache.get(smiles);
  if (!cached) {
    cached = renderMolecule(smiles).then((r) => r.svg);
    svgCache.set(smiles, cached);
    cached.catch(() => svgCache.delete(smiles));
  }
  return cached;
}

// RDKit's SVG hardcodes width='260px' height='160px', which ignores the
// container's CSS size. Swap those for 100%, so the viewBox (still intact)
// scales the drawing to fill the container div instead.
function fitToContainer(svg: string): string {
  return svg.replace(/(<svg[^>]*)\swidth='[^']*'\s+height='[^']*'/, "$1 width='100%' height='100%'");
}

interface MoleculeStructureProps {
  smiles: string;
  width?: number;
  height?: number;
}

export function MoleculeStructure({ smiles, width = 130, height = 80 }: MoleculeStructureProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setSvg(null);
    setFailed(false);
    getSvg(smiles)
      .then((result) => {
        if (!cancelled) setSvg(result);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [smiles]);

  if (failed) return null;
  if (!svg) return <Skeleton.Image active style={{ width, height }} />;

  return (
    <div
      style={{ width, height, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: fitToContainer(svg) }}
    />
  );
}
