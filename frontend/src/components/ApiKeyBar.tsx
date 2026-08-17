import { useState } from 'react';
import { KeyOutlined } from '@ant-design/icons';
import { Input, Space, Tooltip, Typography } from 'antd';
import { getApiKey, setApiKey } from '../api';

const { Text } = Typography;

export function ApiKeyBar() {
  const [value, setValue] = useState(getApiKey());

  return (
    <Tooltip title="Sent as the X-API-Key header on every request. Configured server-side via API_KEYS; stored only in this browser's local storage.">
      <Space>
        <Text type="secondary">
          <KeyOutlined /> API key
        </Text>
        <Input.Password
          value={value}
          placeholder="demo-key-change-me"
          style={{ width: 220 }}
          visibilityToggle
          onChange={(e) => {
            setValue(e.target.value);
            setApiKey(e.target.value);
          }}
        />
      </Space>
    </Tooltip>
  );
}
