import { useState } from 'react';
import { InboxOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Space, Table, Typography, Upload } from 'antd';
import { ApiError, importMolecules } from '../api';
import type { BatchImportResult } from '../types';

const { Paragraph, Text } = Typography;

const SAMPLE_CSV = `smiles
CC(=O)OC1=CC=CC=C1C(=O)O
CN1C=NC2=C1C(=O)N(C(=O)N2C)C
CC(C)Cc1ccc(cc1)C(C)C(=O)O
c1ccccc1
CCO
not-a-real-smiles
`;

function inferFormat(filename: string): 'sdf' | 'csv' {
  return filename.toLowerCase().endsWith('.sdf') ? 'sdf' : 'csv';
}

interface BatchImportSectionProps {
  onImported: () => void;
}

export function BatchImportSection({ onImported }: BatchImportSectionProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchImportResult | null>(null);

  const runImport = async (target: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await importMolecules(target, inferFormat(target.name));
      setResult(res);
      if (res.inserted > 0) onImported();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const trySample = () => {
    const sampleFile = new File([SAMPLE_CSV], 'sample-molecules.csv', { type: 'text/csv' });
    setFile(sampleFile);
    runImport(sampleFile);
  };

  const failedRows = result?.rows.filter((row) => !row.ok) ?? [];

  return (
    <Card type="inner" title="Batch import" style={{ marginTop: 24 }}>
      <Paragraph type="secondary">
        Upload an <Text code>.sdf</Text> file, or a CSV/plain-text file with one SMILES per
        line (a <Text code>smiles</Text> column header is also fine) — up to 500 molecules,
        10MB. Each row is parsed and analyzed independently, so a few bad rows don't fail the
        rest of the batch.
      </Paragraph>

      <Space wrap style={{ marginBottom: 16 }}>
        <Upload
          accept=".sdf,.csv,.smi,.txt"
          showUploadList={false}
          beforeUpload={(selected) => {
            setFile(selected);
            setResult(null);
            return false;
          }}
        >
          <Button icon={<InboxOutlined />}>Choose file</Button>
        </Upload>
        {file && <Text>{file.name}</Text>}
        <Button type="primary" disabled={!file} loading={loading} onClick={() => file && runImport(file)}>
          Import
        </Button>
        <Button onClick={trySample} loading={loading}>
          Try a sample file
        </Button>
      </Space>

      {error && <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}

      {result && (
        <>
          <Alert
            type={result.failed === 0 ? 'success' : 'warning'}
            message={`${result.inserted} of ${result.total} molecule(s) imported${result.failed ? `, ${result.failed} failed` : ''}`}
            style={{ marginBottom: 16 }}
          />
          {failedRows.length > 0 && (
            <Table
              size="small"
              rowKey="row"
              pagination={false}
              dataSource={failedRows}
              columns={[
                { title: 'Row', dataIndex: 'row', width: 80 },
                { title: 'Error', dataIndex: 'error' },
              ]}
            />
          )}
        </>
      )}
    </Card>
  );
}
