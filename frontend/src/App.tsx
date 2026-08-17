import { ExperimentOutlined } from '@ant-design/icons';
import { Layout, Space, Tabs, Typography } from 'antd';
import { ApiKeyBar } from './components/ApiKeyBar';
import { MoleculesPanel } from './components/MoleculesPanel';
import { SimilarityPanel } from './components/SimilarityPanel';
import { SubstructurePanel } from './components/SubstructurePanel';

const { Header, Content, Footer } = Layout;
const { Title } = Typography;

function App() {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <ExperimentOutlined style={{ color: '#fff', fontSize: 22 }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>
            MolHub
          </Title>
        </Space>
        <ApiKeyBar />
      </Header>
      <Content style={{ padding: '24px 32px', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
        <Tabs
          defaultActiveKey="molecules"
          items={[
            { key: 'molecules', label: 'Molecules', children: <MoleculesPanel /> },
            { key: 'substructure', label: 'Substructure search', children: <SubstructurePanel /> },
            { key: 'similarity', label: 'Similarity search', children: <SimilarityPanel /> },
          ]}
        />
      </Content>
      <Footer style={{ textAlign: 'center' }}>MolHub — molecular screening platform</Footer>
    </Layout>
  );
}

export default App;
