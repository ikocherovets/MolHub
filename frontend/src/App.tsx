import { ExperimentOutlined } from '@ant-design/icons';
import { Layout, Space, Tabs, Typography } from 'antd';
import { DashboardPanel } from './components/DashboardPanel';
import { MoleculesPanel } from './components/MoleculesPanel';
import { PredictPanel } from './components/PredictPanel';
import { SimilarityPanel } from './components/SimilarityPanel';
import { SubstructurePanel } from './components/SubstructurePanel';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Link } = Typography;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center' }}>
        <Space>
          <ExperimentOutlined style={{ color: '#fff', fontSize: 22 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            MolHub
          </Title>
        </Space>
      </Header>
      <Content style={{ padding: '24px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
        <Paragraph type="secondary" style={{ marginBottom: 20 }}>
          Store molecules by SMILES, then look them up by drug-likeness, by a SMARTS
          substructure, or by similarity to another molecule. Full endpoint reference:{' '}
          <Link href="/docs" target="_blank">Swagger docs</Link>.
        </Paragraph>
        <Tabs
          defaultActiveKey="molecules"
          items={[
            { key: 'molecules', label: 'Molecules', children: <MoleculesPanel /> },
            { key: 'substructure', label: 'Substructure search', children: <SubstructurePanel /> },
            { key: 'similarity', label: 'Similarity search', children: <SimilarityPanel /> },
            { key: 'predict', label: 'Predict (ML)', children: <PredictPanel /> },
            { key: 'dashboard', label: 'Dashboard', children: <DashboardPanel /> },
          ]}
        />
      </Content>
      <Footer style={{ textAlign: 'center' }}>MolHub — molecular screening platform</Footer>
    </Layout>
  );
}

export default App;
