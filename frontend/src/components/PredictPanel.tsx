import { useState } from 'react';
import { ExperimentOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Form, Input, Progress, Tag, Typography } from 'antd';
import { ApiError, predictDruglike } from '../api';
import type { DruglikePrediction } from '../types';
import { ExampleChips } from './ExampleChips';

const { Paragraph, Text } = Typography;

const ASPIRIN = 'CC(=O)OC1=CC=CC=C1C(=O)O';

const EXAMPLES = [
  { label: 'Aspirin (drug-like)', value: ASPIRIN },
  { label: 'Ibuprofen (drug-like)', value: 'CC(C)Cc1ccc(cc1)C(C)C(=O)O' },
  { label: '4x Aspirin (violates rule)', value: [ASPIRIN, ASPIRIN, ASPIRIN, ASPIRIN].join('.') },
];

function druglikeTag(value: boolean) {
  return value ? <Tag color="green">drug-like</Tag> : <Tag color="red">not drug-like</Tag>;
}

export function PredictPanel() {
  const [form] = Form.useForm<{ smiles: string }>();
  const [result, setResult] = useState<DruglikePrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async ({ smiles }: { smiles: string }) => {
    setLoading(true);
    setError(null);
    try {
      setResult(await predictDruglike(smiles.trim()));
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : 'Prediction failed');
    } finally {
      setLoading(false);
    }
  };

  const agrees = result && result.predicted_druglike === result.rule_based_druglike;

  return (
    <Card title="Predict drug-likeness (ML)" bordered={false}>
      <Paragraph type="secondary">
        A small QSAR-style classifier (scikit-learn RandomForest on a Morgan fingerprint) trained
        to guess Lipinski drug-likeness <b>without computing MW/LogP/etc</b> — structure in,
        prediction out. Shown next to the deterministic rule-based value from the Molecules tab,
        so you can see where the model agrees or disagrees with the rule it's approximating.
      </Paragraph>
      <Form form={form} layout="inline" onFinish={onSubmit} style={{ marginBottom: 16 }}>
        <Form.Item name="smiles" rules={[{ required: true, message: 'Enter a SMILES string' }]} style={{ flex: 1, minWidth: 260 }}>
          <Input placeholder="SMILES, e.g. CC(=O)OC1=CC=CC=C1C(=O)O" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<ExperimentOutlined />} loading={loading}>
            Predict
          </Button>
        </Form.Item>
      </Form>

      <ExampleChips examples={EXAMPLES} onSelect={(value) => form.setFieldsValue({ smiles: value })} />

      {error && <Alert type="error" message={error} closable onClose={() => setError(null)} style={{ marginBottom: 16 }} />}

      {result && (
        <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Canonical SMILES">
            <Text code>{result.canonical_smiles}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="Model prediction">
            {druglikeTag(result.predicted_druglike)}
          </Descriptions.Item>
          <Descriptions.Item label="Model confidence">
            <Progress percent={Math.round(result.probability * 100)} size="small" style={{ maxWidth: 300 }} />
          </Descriptions.Item>
          <Descriptions.Item label="Rule-based (Lipinski) value">
            {druglikeTag(result.rule_based_druglike)}
          </Descriptions.Item>
          <Descriptions.Item label="Agreement">
            {agrees ? <Tag color="blue">model agrees with the rule</Tag> : <Tag color="orange">model disagrees with the rule</Tag>}
          </Descriptions.Item>
        </Descriptions>
      )}
    </Card>
  );
}
