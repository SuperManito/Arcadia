import React, { useEffect, useRef, useState } from 'react'
import type { InputRef } from 'antd'
import { Button, Col, Checkbox, Divider, Flex, Input, InputNumber, Popover, Row, Segmented, Space, Select, Switch, Tooltip, ConfigProvider, theme } from 'antd'
import { DockerIcon, PodmanIcon, ICON } from '../Icon'
import Heading from '@theme/Heading'
import CodeBlock from '@theme/CodeBlock'
import { useColorMode } from '@docusaurus/theme-common'

export default function NewComponent () {
  function DockerComposeV2 () {
    const fileName = 'docker-compose.yaml'
    return (
      <div>
        <ul>
          <li>
            <Heading as="h3">新建 YAML 文件</Heading>
          </li>
          <CodeBlock language="bash">
            {`${useCurrentDir ? `vim ${fileName}` : `mkdir -p /opt/arcadia && cd /opt/arcadia\nvim ${fileName}`}`}
          </CodeBlock>
          <li>
            <Heading as="h3">编辑内容</Heading>
          </li>
          <CodeBlock language="yaml">
            {`services:
  arcadia:
    image: ${backupMirrortChecked ? 'registry.cn-hangzhou.aliyuncs.com/' : ''}supermanito/arcadia:beta
    container_name: ${containerName}
    hostname: ${hostname}
    restart: always
    tty: true
    network_mode: ${network}
    ports:
      - ${port}:5678${mountLines}`}
          </CodeBlock>
          <li>
            <Heading as="h3">启动容器</Heading>
          </li>
          <CodeBlock language="bash">{'docker compose up -d'}</CodeBlock>
        </ul>
      </div>
    )
  }

  function DockerComposeV1 () {
    const fileName = 'docker-compose.yaml'
    return (
      <div>
        <ul>
          <li>
            <Heading as="h3">新建 YAML 文件</Heading>
          </li>
          <CodeBlock language="bash">
            {`${useCurrentDir ? `vim ${fileName}` : `mkdir -p /opt/arcadia && cd /opt/arcadia\nvim ${fileName}`}`}
          </CodeBlock>
          <li>
            <Heading as="h3">编辑内容</Heading>
          </li>
          <CodeBlock language="yaml">
            {`version: '2.0'
services:
  arcadia:
    image: ${backupMirrortChecked ? 'registry.cn-hangzhou.aliyuncs.com/' : ''}supermanito/arcadia:beta
    container_name: ${containerName}
    hostname: ${hostname}
    restart: always
    tty: true
    network_mode: ${network}
    ports:
      - ${port}:5678${mountLines}`}
          </CodeBlock>
          <li>
            <Heading as="h3">启动容器</Heading>
          </li>
          <CodeBlock language="bash">{'docker-compose up -d'}</CodeBlock>
        </ul>
      </div>
    )
  }

  function PodmanCompose () {
    const fileName = 'podman-compose.yaml'
    return (
      <div>
        <ul>
          <li>
            <Heading as="h3">新建 YAML 文件</Heading>
          </li>
          <CodeBlock language="bash">
            {`${useCurrentDir ? `vim ${fileName}` : `mkdir -p /opt/arcadia && cd /opt/arcadia\nvim ${fileName}`}`}
          </CodeBlock>
          <li>
            <Heading as="h3">编辑内容</Heading>
          </li>
          <CodeBlock language="yaml">
            {`version: '3.8'
services:
  arcadia:
    image: ${backupMirrortChecked ? 'registry.cn-hangzhou.aliyuncs.com/' : 'docker.io/'}supermanito/arcadia:beta
    container_name: ${containerName}
    hostname: ${hostname}
    tty: true
    network_mode: ${network}
    ports:
      - ${port}:5678${mountLines}`}
          </CodeBlock>
          <li>
            <Heading as="h3">启动容器</Heading>
          </li>
          <CodeBlock language="bash">{'podman-compose up -d'}</CodeBlock>
        </ul>
      </div>
    )
  }

  // isMobile
  const [isMobile, setIsMobile] = useState(false)
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

  const { colorMode } = useColorMode() // ConfigProvider 主题
  const [type, setType] = useState('docker-compose-v2') // 类型
  const [backupMirrortChecked, setBackupMirrortChecked] = useState(false)
  const [selectedMounts, setSelectedMounts] = useState(['config', 'log', 'scripts', 'repo', 'raw', 'tgbot'])
  const [useCurrentDir, setUseCurrentDir] = useState(false)
  const [containerName, setContainerName] = useState('arcadia')
  const [hostname, setHostname] = useState('arcadia')
  const [network, setNetwork] = useState('bridge')
  const [networkItems, setNetworkItems] = useState(['bridge', 'host', 'none'])
  const [selectInput, setSelectInput] = useState('')
  const networkInputRef = useRef<InputRef>(null)
  const addNetworkItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    const target = selectInput || 'container:arcadia'
    setNetworkItems([...networkItems, target])
    setSelectInput(target)
    setTimeout(() => {
      networkInputRef.current?.focus()
      setSelectInput('')
    }, 0)
  }
  const [port, setPort] = useState(5678)
  const mountOptions = [
    { label: '配置文件', value: 'config' },
    { label: '运行日志', value: 'log' },
    { label: '个人文件', value: 'scripts' },
    { label: '代码仓库', value: 'repo' },
    { label: '远程文件', value: 'raw' },
    { label: 'TG机器人', value: 'tgbot' },
  ]
  const mountPrefix = useCurrentDir ? '.' : '/opt/arcadia' // 根据状态变量决定挂载路径前缀
  const mountLines = selectedMounts.length > 0 ? '\n    volumes:\n' + selectedMounts.map(mount => `      - ${mountPrefix}/${mount}:/arcadia/${mount}`).join('\n') : ''

  return (
    <ConfigProvider
      theme={{
        algorithm: colorMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Space wrap size="small" style={{ paddingBottom: '10px', lineHeight: '0' }}>
        <Segmented
          options={[
            {
              label: isMobile ? 'V2' : 'Docker Compose V2',
              value: 'docker-compose-v2',
              icon: <DockerIcon />,
            },
            {
              label: isMobile ? 'V1' : 'Docker Compose V1',
              value: 'docker-compose-v1',
              icon: <DockerIcon />,
            },
            {
              label: isMobile ? 'Podman' : 'Podman Compose',
              value: 'podman-compose',
              icon: <PodmanIcon />,
            },
          ]}
          value={type}
          onChange={(value) => { setType(value) }}
        />
        <Tooltip title={!isMobile ? '高级配置' : ''}>
          <Popover
            trigger={!isMobile ? 'click' : 'hover'}
            placement={!isMobile ? 'rightTop' : undefined}
            content={
              <Row>
                <Col span={16}>
                <Flex vertical wrap="wrap" gap="small">
                  <span style={{ fontWeight: 600 }}>基础配置</span>
                  <Flex gap="small" justify="space-between" style={{ userSelect: 'none', width: '200px' }}>
                    使用国内镜像
                    <Switch checked={backupMirrortChecked} onChange={setBackupMirrortChecked} />
                  </Flex>
                  <Flex gap="small" justify="space-between" style={{ userSelect: 'none', width: '200px' }}>
                    挂载至当前目录
                    <Switch checked={useCurrentDir} onChange={setUseCurrentDir} />
                  </Flex>
                  <Flex gap="small">
                    容器名称
                    <Input size="small" style={{ width: 'calc(100% - 80px)' }} placeholder="请输入" value={containerName} onChange={e => { setContainerName(e.target.value ?? 'arcadia') }} />
                  </Flex>
                  <Flex gap="small">
                    主机名称
                    <Input size="small" style={{ width: 'calc(100% - 80px)' }} placeholder="请输入" value={hostname} onChange={e => { setHostname(e.target.value ?? 'arcadia') }} />
                  </Flex>
                  <Flex gap="small">
                    网络模式
                    <Select
                      size="small"
                      style={{ width: 'calc(100% - 80px)' }}
                      placeholder="请选择"
                      dropdownRender={(menu) => (
                        <>
                          {menu}
                          <Divider style={{ margin: '4px 0' }} />
                          <Flex gap="small">
                            <Input
                              size="small"
                              placeholder="请输入"
                              ref={networkInputRef}
                              value={selectInput}
                              onChange={e => { setSelectInput(e.target.value) }}
                              onKeyDown={(e) => { e.stopPropagation() }}
                            />
                            <Button size="small" type="text" style={{ padding: '0 4px' }} onClick={addNetworkItem}>
                              <ICON size="16px" style={{ verticalAlign: '-0.25em' }}>mdi:plus</ICON>
                            </Button>
                          </Flex>
                        </>
                      )}
                      options={networkItems.map((item) => ({ label: item, value: item }))}
                      defaultValue={network}
                      onChange={(value: string) => { setNetwork(value ?? 'bridge') }}
                    />
                  </Flex>
                  <Flex gap="small">
                    端口映射
                    <InputNumber size="small" style={{ width: 'calc(100% - 80px)' }} placeholder="请输入" value={port} onChange={(value) => { setPort(value ?? 5678) }} />
                  </Flex>
                </Flex>
                </Col>
                <Col span={8}>
                  <Flex vertical wrap="wrap" gap="small">
                    <span style={{ fontWeight: 600 }}>挂载目录配置</span>
                    <Checkbox.Group style={{ userSelect: 'none', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '8px' }} options={mountOptions} value={selectedMounts} onChange={setSelectedMounts} />
                  </Flex>
                </Col>
              </Row>
            }>
            <Button type="text" shape="circle" size="small" style={{ padding: '2px' }}><ICON size="18">ic:outline-settings</ICON></Button>
          </Popover>
        </Tooltip>
      </Space>
      {type === 'docker-compose-v2' && <DockerComposeV2 />}
      {type === 'docker-compose-v1' && <DockerComposeV1 />}
      {type === 'podman-compose' && <PodmanCompose />}
    </ConfigProvider>
  )
}
