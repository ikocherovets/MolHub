import { Space, Tag, Typography } from 'antd';

const { Text } = Typography;

export interface Example {
  label: string;
  value: string;
}

interface ExampleChipsProps {
  examples: Example[];
  onSelect: (value: string) => void;
}

export function ExampleChips({ examples, onSelect }: ExampleChipsProps) {
  return (
    <Space wrap style={{ marginBottom: 16 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Try:
      </Text>
      {examples.map((example) => (
        <Tag key={example.label} className="mh-chip" onClick={() => onSelect(example.value)}>
          {example.label}
        </Tag>
      ))}
    </Space>
  );
}
