import { ExperimentOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import { App as AntApp, ConfigProvider, Layout, Space, Switch, Tabs, theme, Typography } from 'antd';
import { DashboardPanel } from './components/DashboardPanel';
import { MoleculesPanel } from './components/MoleculesPanel';
import { PredictPanel } from './components/PredictPanel';
import { SimilarityPanel } from './components/SimilarityPanel';
import { SubstructurePanel } from './components/SubstructurePanel';
import { palette, paletteCssVars, useThemeMode } from './theme';

const { Header, Content, Footer } = Layout;
const { Title, Paragraph, Link, Text } = Typography;

const FONT_FAMILY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

function App() {
  const { dark, setDark } = useThemeMode();
  const p = palette[dark ? 'dark' : 'light'];

  return (
    <ConfigProvider
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: p.primary,
          colorBgLayout: p.bg,
          colorBgContainer: p.surface,
          colorBorder: p.border,
          colorBorderSecondary: p.border,
          borderRadius: 8,
          fontFamily: FONT_FAMILY,
        },
        components: {
          Layout: { headerBg: p.surface, bodyBg: p.bg, footerBg: 'transparent' },
          Tag: { defaultBg: p.surfaceSubtle, defaultColor: p.textSecondary },
        },
      }}
    >
      <AntApp>
        <Layout style={{ minHeight: '100vh', ...paletteCssVars(p) }}>
          <Header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: `1px solid ${p.border}`,
              padding: '0 32px',
              height: 64,
              lineHeight: '64px',
            }}
          >
            <Space size={10}>
              <ExperimentOutlined style={{ color: p.primary, fontSize: 20 }} />
              <Title level={4} style={{ color: p.text, margin: 0, fontWeight: 600 }}>
                MolHub
              </Title>
              <Text type="secondary" style={{ fontSize: 13, marginLeft: 4 }}>
                Molecular screening
              </Text>
            </Space>
            <Switch
              checked={dark}
              onChange={setDark}
              checkedChildren={<MoonOutlined />}
              unCheckedChildren={<SunOutlined />}
              aria-label="Toggle dark mode"
            />
          </Header>
          <Content style={{ padding: '28px 32px', maxWidth: 1200, width: '100%', margin: '0 auto' }}>
            <Paragraph type="secondary" style={{ marginBottom: 24 }}>
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
          <Footer
            style={{
              textAlign: 'center',
              color: p.textSecondary,
              fontSize: 13,
              borderTop: `1px solid ${p.border}`,
              padding: '16px 0',
            }}
          >
            MolHub — molecular screening platform
          </Footer>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
