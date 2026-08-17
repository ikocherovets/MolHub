import { QuestionCircleOutlined } from '@ant-design/icons';
import { Space, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DRUGLIKE_EXPLANATION } from '../copy';
import type { Molecule, SimilarityResult } from '../types';
import { MoleculeStructure } from './MoleculeStructure';

const { Text } = Typography;

function baseColumns<T extends Molecule>(): ColumnsType<T> {
  return [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, ellipsis: true },
    {
      title: 'Structure',
      dataIndex: 'smiles',
      key: 'structure',
      width: 140,
      render: (value: string) => <MoleculeStructure smiles={value} />,
    },
    {
      title: 'SMILES',
      dataIndex: 'smiles',
      key: 'smiles',
      render: (value: string) => <Text code>{value}</Text>,
    },
    { title: 'MW', dataIndex: 'mw', key: 'mw', width: 90 },
    { title: 'LogP', dataIndex: 'logp', key: 'logp', width: 90 },
    { title: 'TPSA', dataIndex: 'tpsa', key: 'tpsa', width: 90 },
    { title: 'HBD', dataIndex: 'h_donors', key: 'h_donors', width: 70 },
    { title: 'HBA', dataIndex: 'h_acceptors', key: 'h_acceptors', width: 70 },
    { title: 'Rings', dataIndex: 'ring_count', key: 'ring_count', width: 80 },
    {
      title: (
        <Tooltip title={DRUGLIKE_EXPLANATION}>
          <Space size={4}>
            Drug-like
            <QuestionCircleOutlined />
          </Space>
        </Tooltip>
      ),
      dataIndex: 'druglike',
      key: 'druglike',
      width: 110,
      render: (value: boolean) => (value ? <Tag color="green">yes</Tag> : <Tag>no</Tag>),
    },
  ];
}

const similarityColumn: ColumnsType<SimilarityResult>[number] = {
  title: 'Similarity',
  dataIndex: 'similarity',
  key: 'similarity',
  width: 110,
  sorter: (a, b) => a.similarity - b.similarity,
  defaultSortOrder: 'descend',
  render: (value: number) => value.toFixed(3),
};

interface MoleculeTableProps {
  data: Molecule[];
  loading?: boolean;
  showSimilarity?: false;
}

interface SimilarityTableProps {
  data: SimilarityResult[];
  loading?: boolean;
  showSimilarity: true;
}

export function MoleculeTable({ data, loading, showSimilarity }: MoleculeTableProps | SimilarityTableProps) {
  if (showSimilarity) {
    return (
      <Table<SimilarityResult>
        rowKey="id"
        size="small"
        loading={loading}
        columns={[...baseColumns<SimilarityResult>(), similarityColumn]}
        dataSource={data}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        scroll={{ x: true }}
      />
    );
  }
  return (
    <Table<Molecule>
      rowKey="id"
      size="small"
      loading={loading}
      columns={baseColumns<Molecule>()}
      dataSource={data}
      pagination={{ pageSize: 10, hideOnSinglePage: true }}
      scroll={{ x: true }}
    />
  );
}
