import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Spin, Statistic, Typography } from 'antd';
import { ApiError, listMolecules } from '../api';
import type { Molecule } from '../types';
import { ChemicalSpaceChart } from './ChemicalSpaceChart';

const { Paragraph } = Typography;

export function DashboardPanel() {
  const [molecules, setMolecules] = useState<Molecule[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMolecules(false)
      .then(setMolecules)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load molecules'));
  }, []);

  if (error) {
    return (
      <Card title="Dashboard" bordered={false}>
        <Alert type="error" message={error} />
      </Card>
    );
  }

  if (!molecules) {
    return (
      <Card title="Dashboard" bordered={false}>
        <Spin />
      </Card>
    );
  }

  const total = molecules.length;
  const druglikeCount = molecules.filter((m) => m.druglike).length;
  const avgMw = total ? molecules.reduce((sum, m) => sum + (m.mw ?? 0), 0) / total : 0;

  return (
    <Card title="Dashboard" bordered={false}>
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col>
          <Statistic title="Molecules stored" value={total} />
        </Col>
        <Col>
          <Statistic title="Drug-like" value={total ? Math.round((druglikeCount / total) * 100) : 0} suffix="%" />
        </Col>
        <Col>
          <Statistic title="Average MW" value={avgMw} precision={1} />
        </Col>
      </Row>

      <Paragraph type="secondary">
        Every stored molecule plotted by LogP (x) vs molecular weight (y) — the two
        axes medicinal chemistry classically uses to eyeball "lead-like" chemical
        space. Shape <i>and</i> color both mark Lipinski drug-likeness (a plain
        red/green pair isn't distinguishable under red-green color blindness).
        Hover a point for details.
      </Paragraph>

      <ChemicalSpaceChart molecules={molecules} />
    </Card>
  );
}
