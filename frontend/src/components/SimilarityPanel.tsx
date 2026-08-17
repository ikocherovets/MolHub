import { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, InputNumber, Typography } from 'antd';
import { ApiError, searchSimilarity } from '../api';
import type { SimilarityResult } from '../types';
import { ExampleChips } from './ExampleChips';
import { MoleculeTable } from './MoleculeTable';

const { Paragraph } = Typography;

interface FormValues {
  smiles: string;
  threshold: number;
}

const EXAMPLES = [
  { label: 'Aspirin', value: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
  { label: 'Caffeine', value: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
  { label: 'Ibuprofen', value: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' },
];

export function SimilarityPanel() {
  const [form] = Form.useForm<FormValues>();
  const [results, setResults] = useState<SimilarityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const onSearch = async ({ smiles, threshold }: FormValues) => {
    setLoading(true);
    setError(null);
    try {
      setResults(await searchSimilarity(smiles.trim(), threshold));
      setSearched(true);
    } catch (err) {
      setResults([]);
      setError(err instanceof ApiError ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Similarity search" bordered={false}>
      <Paragraph type="secondary">
        Rank stored molecules by Tanimoto similarity (Morgan fingerprint) to a query SMILES.
      </Paragraph>
      <Form<FormValues> form={form} layout="inline" onFinish={onSearch} initialValues={{ threshold: 0.7 }} style={{ marginBottom: 16 }}>
        <Form.Item name="smiles" rules={[{ required: true, message: 'Enter a SMILES string' }]} style={{ flex: 1, minWidth: 260 }}>
          <Input placeholder="SMILES, e.g. CC(=O)OC1=CC=CC=C1C(=O)O" />
        </Form.Item>
        <Form.Item name="threshold">
          <InputNumber min={0} max={1} step={0.05} />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
            Search
          </Button>
        </Form.Item>
      </Form>

      <ExampleChips examples={EXAMPLES} onSelect={(value) => form.setFieldsValue({ smiles: value })} />

      {error && <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}

      {searched && <MoleculeTable data={results} loading={loading} showSimilarity />}
    </Card>
  );
}
