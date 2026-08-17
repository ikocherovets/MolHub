import { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { ApiError, searchSubstructure } from '../api';
import type { Molecule } from '../types';
import { MoleculeTable } from './MoleculeTable';

const { Paragraph, Text } = Typography;

export function SubstructurePanel() {
  const [results, setResults] = useState<Molecule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const onSearch = async ({ smarts }: { smarts: string }) => {
    setLoading(true);
    setError(null);
    try {
      setResults(await searchSubstructure(smarts.trim()));
      setSearched(true);
    } catch (err) {
      setResults([]);
      setError(err instanceof ApiError ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Substructure search" bordered={false}>
      <Paragraph type="secondary">
        Find molecules containing a SMARTS pattern, e.g. <Text code>c1ccccc1</Text> (benzene ring).
      </Paragraph>
      <Form layout="inline" onFinish={onSearch} style={{ marginBottom: 16 }}>
        <Form.Item name="smarts" rules={[{ required: true, message: 'Enter a SMARTS pattern' }]} style={{ flex: 1, minWidth: 260 }}>
          <Input placeholder="SMARTS, e.g. c1ccccc1" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
            Search
          </Button>
        </Form.Item>
      </Form>

      {error && <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}

      {searched && <MoleculeTable data={results} loading={loading} />}
    </Card>
  );
}
