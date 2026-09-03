import { Card, Empty, Skeleton, Space, Tag, Tooltip, Typography } from 'antd';
import type { Molecule } from '../types';
import { MoleculeStructure } from './MoleculeStructure';

const { Text } = Typography;

interface MoleculeGridProps {
  data: Molecule[];
  loading?: boolean;
}

// mols2grid-style browsing view: a thumbnail-first grid instead of a row-first
// table, for scanning structures the way a chemist would rather than reading
// SMILES strings. Full descriptors surface on hover instead of taking up
// permanent card space.
export function MoleculeGrid({ data, loading }: MoleculeGridProps) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} size="small" styles={{ body: { padding: 10 } }}>
            <Skeleton.Image active style={{ width: '100%', height: 100 }} />
          </Card>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return <Empty description="No molecules to show" />;
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
      {data.map((m) => (
        <Tooltip
          key={m.id}
          title={
            <Space direction="vertical" size={2}>
              <Text style={{ color: '#fff', fontFamily: 'monospace', fontSize: 11 }}>{m.smiles}</Text>
              <Text style={{ color: '#fff', fontSize: 12 }}>MW {m.mw ?? '—'} · LogP {m.logp ?? '—'} · TPSA {m.tpsa ?? '—'}</Text>
              <Text style={{ color: '#fff', fontSize: 12 }}>HBD {m.h_donors ?? '—'} · HBA {m.h_acceptors ?? '—'} · Rings {m.ring_count ?? '—'}</Text>
            </Space>
          }
        >
          <Card size="small" hoverable styles={{ body: { padding: 10 } }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <MoleculeStructure smiles={m.smiles} width={150} height={100} />
            </div>
            <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                MW {m.mw ?? '—'}
              </Text>
              {m.druglike ? <Tag color="green">drug-like</Tag> : <Tag>not drug-like</Tag>}
            </div>
          </Card>
        </Tooltip>
      ))}
    </div>
  );
}
