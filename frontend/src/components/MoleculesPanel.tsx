import { useCallback, useEffect, useState } from 'react';
import { PlusOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Checkbox, Flex, Form, Input, Space, Tooltip, Typography } from 'antd';
import { ApiError, createMolecule, listMolecules } from '../api';
import { DRUGLIKE_EXPLANATION } from '../copy';
import type { Molecule } from '../types';
import { ExampleChips } from './ExampleChips';
import { MoleculeTable } from './MoleculeTable';

const { Paragraph, Text } = Typography;

const EXAMPLES = [
  { label: 'Aspirin', value: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
  { label: 'Caffeine', value: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
  { label: 'Ibuprofen', value: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' },
  { label: 'Benzene', value: 'c1ccccc1' },
  { label: 'Ethanol', value: 'CCO' },
];

export function MoleculesPanel() {
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [druglikeOnly, setDruglikeOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        <Space />
      </Flex>

      <MoleculeTable data={molecules} loading={loading} />
    </Card>
  );
}
