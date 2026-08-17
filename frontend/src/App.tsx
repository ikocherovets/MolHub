import { ExperimentOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { App as AntApp, ConfigProvider, Layout, Space, Switch, Tabs, theme, Typography } from 'antd';
import { DashboardPanel } from './components/DashboardPanel';
import { MoleculesPanel } from './components/MoleculesPanel';
import { PredictPanel } from './components/PredictPanel';
import { SimilarityPanel } from './components/SimilarityPanel';
import { SubstructurePanel } from './components/SubstructurePanel';
import { useThemeMode } from './theme';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Link } = Typography;

function App() {
  const { dark, setDark } = useThemeMode();

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#1677ff', borderRadius: 8 },
      }}
    >
      <AntApp>
        <Layout style={{ minHeight: '100vh' }}>
          <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Space>
              <ExperimentOutlined style={{ color: '#fff', fontSize: 22 }} />
              <Title level={4} style={{ color: '#fff', margin: 0 }}>
                MolHub
              </Title>
            </Space>
            <Switch
              checked={dark}
              onChange={setDark}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              aria-label="Toggle dark mode"
            />
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
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
