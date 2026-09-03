import { useCallback, useEffect, useState } from 'react';
import { PlusOutlined, QuestionCircleOutlined, SwapOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Flex, Form, Input, Modal, Segmented, Space, Tooltip, Typography } from 'antd';
import { ApiError, createMolecule, listMolecules } from '../api';
import { DRUGLIKE_EXPLANATION } from '../copy';
import { useThemeMode } from '../theme';
import type { Molecule } from '../types';
import { BatchImportSection } from './BatchImportSection';
import { ExampleChips } from './ExampleChips';
import { MoleculeGrid } from './MoleculeGrid';
import { MoleculeTable } from './MoleculeTable';
import { MAX_COMPARE, PropertyRadarChart } from './PropertyRadarChart';

const { Paragraph, Text } = Typography;

const EXAMPLES = [
  { label: 'Aspirin', value: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
  { label: 'Caffeine', value: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
  { label: 'Ibuprofen', value: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' },
  { label: 'Benzene', value: 'c1ccccc1' },
  { label: 'Ethanol', value: 'CCO' },
];

export function MoleculesPanel() {
  const { dark } = useThemeMode();
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [druglikeOnly, setDruglikeOnly] = useState(false);
  const [view, setView] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [form] = Form.useForm<{ smiles: string }>();

  const load = useCallback(async (filter: boolean) => {
    setLoading(true);
    setError(null);
    try {
      setMolecules(await listMolecules(filter));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load molecules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(druglikeOnly);
  }, [load, druglikeOnly]);

  const onAdd = async ({ smiles }: { smiles: string }) => {
    setSubmitting(true);
    setError(null);
    try {
      await createMolecule(smiles.trim());
      form.resetFields();
      await load(druglikeOnly);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to add molecule');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card title="Molecules" bordered={false}>
      <Paragraph type="secondary">
        Store a molecule from its <Text code>SMILES</Text> string — MW, LogP, TPSA, H-bond
        donors/acceptors, ring count and Lipinski drug-likeness are computed automatically.
      </Paragraph>
      <Form form={form} layout="inline" onFinish={onAdd} style={{ marginBottom: 16 }}>
        <Form.Item name="smiles" rules={[{ required: true, message: 'Enter a SMILES string' }]} style={{ flex: 1, minWidth: 260 }}>
          <Input placeholder="SMILES, e.g. CC(=O)OC1=CC=CC=C1C(=O)O" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />} loading={submitting}>
            Add molecule
          </Button>
        </Form.Item>
      </Form>

      <ExampleChips examples={EXAMPLES} onSelect={(value) => form.setFieldsValue({ smiles: value })} />

      {error && <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}

      <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
        <Checkbox checked={druglikeOnly} onChange={(e) => setDruglikeOnly(e.target.checked)}>
          <Space size={4}>
            Show drug-like (Lipinski) only
            <Tooltip title={DRUGLIKE_EXPLANATION}>
              <QuestionCircleOutlined />
            </Tooltip>
          </Space>
        </Checkbox>
        <Space>
          {selectedIds.length >= 2 && (
            <Button icon={<SwapOutlined />} onClick={() => setCompareOpen(true)}>
              Compare {selectedIds.length} selected
            </Button>
          )}
          <Segmented value={view} onChange={(v) => setView(v as 'table' | 'grid')} options={[{ label: 'Table', value: 'table' }, { label: 'Grid', value: 'grid' }]} />
        </Space>
      </Flex>

      {view === 'table' ? (
        <MoleculeTable
          data={molecules}
          loading={loading}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          maxSelectable={MAX_COMPARE}
        />
      ) : (
        <MoleculeGrid data={molecules} loading={loading} />
      )}

      <BatchImportSection onImported={() => load(druglikeOnly)} />

      <Modal
        title="Property comparison"
        open={compareOpen}
        onCancel={() => setCompareOpen(false)}
        footer={null}
        width={480}
      >
        <Paragraph type="secondary">
          Each axis is normalized to a fixed drug-like reference range (Lipinski/Veber-style
          bounds), not to the selected molecules' own min/max — so a shape that stays inside
          the outer ring means "within typical drug-like bounds" regardless of what else is
          selected. Hover a vertex for its exact value.
        </Paragraph>
        <PropertyRadarChart
          molecules={molecules.filter((m) => selectedIds.includes(m.id))}
          dark={dark}
        />
      </Modal>
    </Card>
  );
}
