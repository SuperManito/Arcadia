import React, { useEffect, useState } from 'react'
import { Checkbox, ConfigProvider, Segmented, Space, theme } from 'antd'
import { DockerIcon, PodmanIcon } from '@site/src/components/Icon'
import CodeBlock from '@theme/CodeBlock'
import { useColorMode } from '@docusaurus/theme-common'

export default function ComposeInstall () {
  function DockerComposeV2 () {
    return (
      <div>
        <br />
        <ul>
          <li><h3>新建 YAML 文件</h3></li>
          <CodeBlock
            language="bash">
            {`mkdir -p /opt/arcadia && cd /opt/arcadia
vim docker-compose.yaml`}
          </CodeBlock>
          <li><h3>编辑内容</h3></li>
          <CodeBlock
            language="yaml">
            {`services:
  arcadia:
    image: ${checked ? 'registry.cn-hangzhou.aliyuncs.com/' : ''}supermanito/arcadia:dev  # 镜像名
    container_name: arcadia  # 容器名（可随意更改）
    hostname: arcadia  # 主机名（可随意更改）
    restart: always  # 开机自启
    tty: true
    network_mode: bridge  # 网卡工作模式，如果是旁路由可能需要切换为 host 类型（桥接），默认为 bridge 类型（NAT）
    ports:
      - 5678:5678  # 端口映射，格式为 "主机端口:容器端口"，主机端口号可自定义，容器端口用来访问控制面板不可修改
    volumes:
      - /opt/arcadia/config:/arcadia/config       # 定义配置文件的主机挂载目录
      - /opt/arcadia/log:/arcadia/log             # 定义日志文件的主机挂载目录
      - /opt/arcadia/scripts:/arcadia/scripts     # 定义个人脚本的主机挂载目录
      - /opt/arcadia/repo:/arcadia/repo           # 定义脚本仓库的主机挂载目录
      - /opt/arcadia/raw:/arcadia/raw             # 定义远程脚本的主机挂载目录
      - /opt/arcadia/tgbot:/arcadia/tgbot         # 定义电报机器人的主机挂载目录`}
          </CodeBlock>
          <li><h3>启动容器</h3></li>
          <CodeBlock
            language="bash">
            {'docker compose up -d'}
          </CodeBlock>
        </ul>
      </div>
    )
  }

  function DockerComposeV1 () {
    return (
      <div>
        <br />
        <ul>
          <li><h3>新建 YAML 文件</h3></li>
          <CodeBlock
            language="bash">
            {`mkdir -p /opt/arcadia && cd /opt/arcadia
vim docker-compose.yaml`}
          </CodeBlock>
          <li><h3>编辑内容</h3></li>
          <CodeBlock
            language="yaml">
            {`version: '2.0'
services:
  arcadia:
    image: ${checked ? 'registry.cn-hangzhou.aliyuncs.com/' : ''}supermanito/arcadia:dev  # 镜像名
    container_name: arcadia  # 容器名（可随意更改）
    hostname: arcadia  # 主机名（可随意更改）
    restart: always  # 开机自启
    tty: true
    network_mode: bridge  # 网卡工作模式，如果是旁路由可能需要切换为 host 类型（桥接），默认为 bridge 类型（NAT）
    ports:
      - 5678:5678  # 端口映射，格式为 "主机端口:容器端口"，主机端口号可自定义，容器端口用来访问控制面板不可修改
    volumes:
      - /opt/arcadia/config:/arcadia/config       # 定义配置文件的主机挂载目录
      - /opt/arcadia/log:/arcadia/log             # 定义日志文件的主机挂载目录
      - /opt/arcadia/scripts:/arcadia/scripts     # 定义个人脚本的主机挂载目录
      - /opt/arcadia/repo:/arcadia/repo           # 定义脚本仓库的主机挂载目录
      - /opt/arcadia/raw:/arcadia/raw             # 定义远程脚本的主机挂载目录
      - /opt/arcadia/tgbot:/arcadia/tgbot         # 定义电报机器人的主机挂载目录`}
          </CodeBlock>
          <li><h3>启动容器</h3></li>
          <CodeBlock
            language="bash">
            {'docker-compose up -d'}
          </CodeBlock>
        </ul>
      </div>
    )
  }

  function PodmanCompose () {
    return (
      <div>
        <br />
        <ul>
          <li><h3>新建 YAML 文件</h3></li>
          <CodeBlock
            language="bash">
            {`mkdir -p /opt/arcadia && cd /opt/arcadia
vim docker-compose.yaml`}
          </CodeBlock>
          <li><h3>编辑内容</h3></li>
          <CodeBlock
            language="yaml">
            {`version: '3.8'
services:
  arcadia:
    image: ${checked ? 'registry.cn-hangzhou.aliyuncs.com/' : 'docker.io/'}supermanito/arcadia:dev  # 镜像名
    container_name: arcadia  # 容器名（可随意更改）
    hostname: arcadia  # 主机名（可随意更改）
    tty: true
    network_mode: bridge  # 网卡工作模式，如果是旁路由可能需要切换为 host 类型（桥接），默认为 bridge 类型（NAT）
    ports:
      - 5678:5678  # 端口映射，格式为 "主机端口:容器端口"，主机端口号可自定义，容器端口用来访问控制面板不可修改
    volumes:
      - /opt/arcadia/config:/arcadia/config       # 定义配置文件的主机挂载目录
      - /opt/arcadia/log:/arcadia/log             # 定义日志文件的主机挂载目录
      - /opt/arcadia/scripts:/arcadia/scripts     # 定义个人脚本的主机挂载目录
      - /opt/arcadia/repo:/arcadia/repo           # 定义脚本仓库的主机挂载目录
      - /opt/arcadia/raw:/arcadia/raw             # 定义远程脚本的主机挂载目录
      - /opt/arcadia/tgbot:/arcadia/tgbot         # 定义电报机器人的主机挂载目录`}
          </CodeBlock>
          <li><h3>启动容器</h3></li>
          <CodeBlock
            language="bash">
            {'podman-compose up -d'}
          </CodeBlock>
        </ul>
      </div>
    )
  }

  const { colorMode } = useColorMode()
  const [value, setValue] = useState('docker-compose-v2')
  const [isMobile, setIsMobile] = useState(false)
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 996) // 设置移动设备的宽度阈值，这里假设小于等于768px为移动设备
    }
    handleResize() // 初始化判断一次
    window.addEventListener('resize', handleResize) // 监听窗口大小改变事件
    return () => {
      window.removeEventListener('resize', handleResize) // 组件卸载时移除事件监听
    }
  }, [])
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
      <Space
        size="large"
      >
        <Segmented
          options={[
            {
              label: isMobile ? 'V2' : 'Docker Compose V2',
              value: 'docker-compose-v2',
              icon: <DockerIcon/>,
            },
            {
              label: isMobile ? 'V1' : 'Docker Compose V1',
              value: 'docker-compose-v1',
              icon: <DockerIcon/>,
            },
            {
              label: isMobile ? '' : 'Podman Compose',
              value: 'podman-compose',
              icon: <PodmanIcon/>,
            },
          ]}
          value={value}
          onChange={handleValueChange}
        />
        <Checkbox checked={checked} onChange={onChange}>
          {'使用国内镜像'}
        </Checkbox>
      </Space>
      {value === 'docker-compose-v2' && <DockerComposeV2 /> }
      {value === 'docker-compose-v1' && <DockerComposeV1 /> }
      {value === 'podman-compose' && <PodmanCompose /> }
    </ConfigProvider>
  )
}
