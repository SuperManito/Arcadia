import React, { useState } from 'react'
import { Checkbox, ConfigProvider, Segmented, Space, theme } from 'antd'
import { DockerIcon, PodmanIcon } from '../Icon'
import CodeBlock from '@theme/CodeBlock'
import { useColorMode } from '@docusaurus/theme-common'

export default function CliInstall () {
  function Docker () {
    return (
      <div>
        <br />
        <CodeBlock language="bash">
          {`docker run -dit \\
--name arcadia \`# 容器名\` \\
--hostname arcadia \`# 主机名\` \\
--network bridge \`# 网卡工作模式\` \\
--restart always \`# 开机自启\` \\
-p 5678:5678 \`# 端口映射，"主机端口:容器端口"\` \\
-v /opt/arcadia/config:/arcadia/config \`# 配置文件的主机挂载目录\` \\
-v /opt/arcadia/log:/arcadia/log \`# 日志文件的主机挂载目录\` \\
-v /opt/arcadia/scripts:/arcadia/scripts \`# 个人脚本的主机挂载目录\` \\
-v /opt/arcadia/repo:/arcadia/repo \`# 脚本仓库的主机挂载目录\` \\
-v /opt/arcadia/raw:/arcadia/raw \`# 远程脚本的主机挂载目录\` \\
-v /opt/arcadia/tgbot:/arcadia/tgbot \`# 电报机器人的主机挂载目录\` \\
${checked ? 'registry.cn-hangzhou.aliyuncs.com/' : ''}supermanito/arcadia:dev`}
        </CodeBlock>
      </div>
    )
  }

  function Podman () {
    return (
      <div>
        <br />
        <CodeBlock language="bash">
          {`podman run -dit \\
--name arcadia \`# 容器名\` \\
--hostname arcadia \`# 主机名\` \\
--network bridge \`# 网卡工作模式\` \\
-p 5678:5678 \`# 端口映射，"主机端口:容器端口"\` \\
-v /opt/arcadia/config:/arcadia/config \`# 配置文件的主机挂载目录\` \\
-v /opt/arcadia/log:/arcadia/log \`# 日志文件的主机挂载目录\` \\
-v /opt/arcadia/scripts:/arcadia/scripts \`# 个人脚本的主机挂载目录\` \\
-v /opt/arcadia/repo:/arcadia/repo \`# 脚本仓库的主机挂载目录\` \\
-v /opt/arcadia/raw:/arcadia/raw \`# 远程脚本的主机挂载目录\` \\
-v /opt/arcadia/tgbot:/arcadia/tgbot \`# 电报机器人的主机挂载目录\` \\
${checked ? 'registry.cn-hangzhou.aliyuncs.com/' : 'docker.io/'}supermanito/arcadia:dev`}
        </CodeBlock>
      </div>
    )
  }

  const { colorMode } = useColorMode()
  const [value, setValue] = useState('docker')
  const [checked, setChecked] = useState(false)

  const handleValueChange = (newValue: any) => {
    setValue(newValue)
  }
  const onChange = (e: any) => {
    setChecked(e.target.checked)
  }
  return (
    <ConfigProvider
      theme={{
        algorithm: colorMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Space size="large">
        <Segmented
          options={[
            {
              label: 'Docker',
              value: 'docker',
              icon: <DockerIcon />,
            },
            {
              label: 'Podman',
              value: 'podman',
              icon: <PodmanIcon />,
            },
          ]}
          value={value}
          onChange={handleValueChange}
        />
        <Checkbox checked={checked} onChange={onChange}>
          {'使用国内镜像'}
        </Checkbox>
      </Space>
      {value === 'docker' && <Docker />}
      {value === 'podman' && <Podman />}
    </ConfigProvider>
  )
}
