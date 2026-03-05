import React, { useMemo, useRef, useState } from 'react'
import type { InputRef } from 'antd'
import { Button, Col, Checkbox, Divider, Flex, Input, InputNumber, Popover, Row, Segmented, Space, Select, Switch, ConfigProvider, theme } from 'antd'
import { DockerIcon, PodmanIcon, Icon } from '../Icon'
import Heading from '@theme/Heading'
import CodeBlock from '@theme/CodeBlock'
import { useColorMode, useWindowSize } from '@docusaurus/theme-common'

function useInstallSharedState () {
  const windowSize = useWindowSize()
  const isMobile = useMemo(() => windowSize === 'mobile', [windowSize])

  const { colorMode } = useColorMode()
  const algorithm = useMemo(() => (colorMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm), [colorMode])

  const mirrorOptions = [
    { label: '无', value: '' },
    { label: '阿里云（备用镜像）', value: 'registry.cn-hangzhou.aliyuncs.com/' },
    { label: '毫秒镜像', value: 'docker.1ms.run/' },
    { label: 'DaoCloud 道客', value: 'docker.m.daocloud.io/' },
  ]

  const [mirror, setMirror] = useState('')
  const [mirrorItems, setMirrorItems] = useState(mirrorOptions)
  const [mirrorInput, setMirrorInput] = useState('')
  const mirrorInputRef = useRef<InputRef>(null)
  const addMirrorItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    const target = mirrorInput
    if (target && !mirrorItems.find(item => item.value === target)) {
      setMirrorItems([...mirrorItems, { label: target, value: target }])
    }
    setMirror(target)
    setTimeout(() => {
      mirrorInputRef.current?.focus()
      setMirrorInput('')
    }, 0)
  }

  const [selectedMounts, setSelectedMounts] = useState(['config', 'log', 'scripts', 'repo', 'raw'])
  const [useCurrentDir, setUseCurrentDir] = useState(false)
  const [containerName, setContainerName] = useState('arcadia')
  const [hostname, setHostname] = useState('arcadia')
  const [network, setNetwork] = useState('bridge')
  const [networkItems, setNetworkItems] = useState(['bridge', 'host', 'none'])
  const [selectInput, setSelectInput] = useState('')
  const networkInputRef = useRef<InputRef>(null)
  const addNetworkItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
    e.preventDefault()
    const target = selectInput || 'bridge'
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

  const mountPrefix = useCurrentDir ? '.' : '/opt/arcadia'

  const getComposeMountLines = () => (selectedMounts.length > 0 ? '\n    volumes:\n' + selectedMounts.map(mount => `      - ${mountPrefix}/${mount}:/arcadia/${mount}`).join('\n') : '')
  const getRunMountLines = () => (selectedMounts.length > 0 ? '\n' + selectedMounts.map(mount => `-v ${useCurrentDir ? '$(pwd)' : '/opt/arcadia'}/${mount}:/arcadia/${mount} \\`).join('\n') : '')

  return {
    isMobile,
    algorithm,
    mirror,
    setMirror,
    mirrorItems,
    mirrorInput,
    setMirrorInput,
    mirrorInputRef,
    addMirrorItem,
    selectedMounts,
    setSelectedMounts,
    useCurrentDir,
    setUseCurrentDir,
    containerName,
    setContainerName,
    hostname,
    setHostname,
    network,
    setNetwork,
    networkItems,
    addNetworkItem,
    selectInput,
    setSelectInput,
    networkInputRef,
    port,
    setPort,
    mountOptions,
    mountPrefix,
    getComposeMountLines,
    getRunMountLines,
  }
}

function PopoverContent ({ s }: { s: ReturnType<typeof useInstallSharedState> }) {
  const {
    containerName,
    setContainerName,
    hostname,
    setHostname,
    network,
    setNetwork,
    networkItems,
    networkInputRef,
    selectInput,
    setSelectInput,
    addNetworkItem,
    port,
    setPort,
    mirror,
    setMirror,
    mirrorItems,
    mirrorInputRef,
    mirrorInput,
    setMirrorInput,
    addMirrorItem,
    useCurrentDir,
    setUseCurrentDir,
    selectedMounts,
    setSelectedMounts,
    mountOptions,
  } = s

  return (
    <div>
      <Row>
        <Col>
          <Flex align="center" vertical wrap="wrap" gap="small">
            <span style={{ fontWeight: 600 }}>基础配置</span>
            <Flex align="center" gap="middle">
              <span>容器名称</span>
              <Input size="small" style={{ width: '140px' }} placeholder="请输入" value={containerName} onChange={e => { setContainerName(e.target.value ?? 'arcadia') }} />
            </Flex>
            <Flex align="center" gap="middle">
              <span>主机名称</span>
              <Input size="small" style={{ width: '140px' }} placeholder="请输入" value={hostname} onChange={e => { setHostname(e.target.value ?? 'arcadia') }} />
            </Flex>
            <Flex align="center" gap="middle">
              <span>网络模式</span>
              <Select
                size="small"
                style={{ width: '140px' }}
                placeholder="请选择"
                popupRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '4px 0' }} />
                    <Flex align="center" gap="small">
                      <Input
                        size="small"
                        placeholder="请输入"
                        ref={networkInputRef}
                        value={selectInput}
                        onChange={e => { setSelectInput(e.target.value) }}
                        onKeyDown={(e) => { e.stopPropagation() }}
                      />
                      <Button size="small" type="text" style={{ padding: '0 4px' }} onClick={addNetworkItem}>
                        <Icon>mdi:plus</Icon>
                      </Button>
                    </Flex>
                  </>
                )}
                options={networkItems.map((item) => ({ label: item, value: item }))}
                defaultValue={network}
                onChange={(value: string) => { setNetwork(value ?? 'bridge') }}
              />
            </Flex>
            <Flex align="center" gap="middle">
              <span>端口映射</span>
              <InputNumber size="small" style={{ width: '140px' }} placeholder="请输入" value={port} onChange={(value) => { setPort(value ?? 5678) }} />
            </Flex>
            <Flex align="center" gap="middle">
              <span>镜像加速</span>
              <Select
                size="small"
                style={{ width: '140px' }}
                popupMatchSelectWidth={false}
                placeholder="请选择"
                popupRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '4px 0' }} />
                    <Flex align="center" gap="small">
                      <Input
                        size="small"
                        placeholder="请输入镜像地址"
                        ref={mirrorInputRef}
                        value={mirrorInput}
                        onChange={e => { setMirrorInput(e.target.value) }}
                        onKeyDown={(e) => { e.stopPropagation() }}
                      />
                      <Button size="small" type="text" style={{ padding: '0 4px' }} onClick={addMirrorItem}>
                        <Icon>mdi:plus</Icon>
                      </Button>
                    </Flex>
                  </>
                )}
                options={mirrorItems.map((item) => ({ label: item.label, value: item.value }))}
                value={mirror}
                onChange={(value: string) => { setMirror(value ?? '') }}
              />
            </Flex>
          </Flex>
        </Col>
      </Row>
      <Row>
        <Col style={{ marginTop: '20px' }}>
          <Flex align="center" vertical wrap="wrap" gap="small">
            <span style={{ fontWeight: 600 }}>挂载目录配置</span>
            <Flex align="center" gap="middle" justify="space-between" style={{ userSelect: 'none', width: '100%' }}>
              <span>挂载至当前目录</span>
              <Switch size="small" checked={useCurrentDir} onChange={setUseCurrentDir} />
            </Flex>
            <Checkbox.Group style={{ userSelect: 'none', marginTop: '2px', display: 'flex', gap: '8px', maxWidth: '212px' }} options={mountOptions} value={selectedMounts} onChange={setSelectedMounts} />
          </Flex>
        </Col>
      </Row>
    </div>
  )
}

export function CliInstall () {
  const s = useInstallSharedState()
  const { isMobile, algorithm, containerName, hostname, network, port, mirror, getRunMountLines } = s
  const [type, setType] = useState('docker') // 类型

  function Docker () {
    return (
      <CodeBlock language="bash">
        {`docker run -dit \\
--name ${containerName} \\
--hostname ${hostname} \\
--network ${network} \\
--restart always \\
-p ${port}:5678 \\${getRunMountLines()}
${mirror}supermanito/arcadia:beta`}
      </CodeBlock>
    )
  }

  function Podman () {
    return (
      <CodeBlock language="bash">
        {`podman run -dit \\
--name ${containerName} \\
--hostname ${hostname} \\
--network ${network} \\
-p ${port}:5678 \\${getRunMountLines()}
${mirror || 'docker.io/'}supermanito/arcadia:beta`}
      </CodeBlock>
    )
  }

  return (
    <ConfigProvider theme={{ algorithm }}>
      <Space wrap size="small" style={{ paddingBottom: '10px', lineHeight: '0', justifyContent: 'space-between', width: '100%' }}>
        <Segmented
          style={{ userSelect: 'none' }}
          options={[
            { label: 'Docker', value: 'docker', icon: <DockerIcon /> },
            { label: 'Podman', value: 'podman', icon: <PodmanIcon /> },
          ]}
          value={type}
          onChange={(value) => { setType(value) }}
        />
        <Popover
          trigger={!isMobile ? 'click' : 'hover'}
          placement={!isMobile ? 'leftTop' : undefined}
          content={<PopoverContent s={s} />}
        >
          <Button type="text" color="default" variant="filled" icon={<Icon size={20}>line-md:cog-loop</Icon>} style={{ padding: '0 4px' }}>
            { !isMobile ? '高级配置' : undefined }
          </Button>
        </Popover>
      </Space>
      <div style={{ paddingTop: '1rem' }}>
        {type === 'docker' && <Docker />}
        {type === 'podman' && <Podman />}
      </div>
    </ConfigProvider>
  )
}

export function ComposeInstall () {
  const s = useInstallSharedState()
  const { isMobile, algorithm, getComposeMountLines, mirror, containerName, hostname, network, port, useCurrentDir } = s
  const [type, setType] = useState('docker-compose-v2') // 类型

  function DockerCompose ({ isV2 = true }: { isV2?: boolean }) {
    const fileName = 'docker-compose.yaml'
    return (
      <>
        <Heading as="h3">新建 YAML 文件</Heading>
        <CodeBlock language="bash">
          {`${useCurrentDir ? `vim ${fileName}` : `mkdir -p /opt/arcadia && cd /opt/arcadia\nvim ${fileName}`}`}
        </CodeBlock>
        <Heading as="h3">编辑内容</Heading>
        <CodeBlock language="yaml">
          {`${!isV2 ? "version: '2.0'\n" : ''}services:\n  arcadia:\n    image: ${mirror}supermanito/arcadia:beta\n    container_name: ${containerName}\n    hostname: ${hostname}\n    restart: always\n    tty: true\n    network_mode: ${network}\n    ports:\n      - ${port}:5678${getComposeMountLines()}`}
        </CodeBlock>
        <Heading as="h3">启动容器</Heading>
        <CodeBlock language="bash">{'docker-compose up -d'}</CodeBlock>
      </>
    )
  }

  function PodmanCompose () {
    const fileName = 'podman-compose.yaml'
    return (
      <>
        <Heading as="h3">新建 YAML 文件</Heading>
        <CodeBlock language="bash">
          {`${useCurrentDir ? `vim ${fileName}` : `mkdir -p /opt/arcadia && cd /opt/arcadia\nvim ${fileName}`}`}
        </CodeBlock>
        <Heading as="h3">编辑内容</Heading>
        <CodeBlock language="yaml">
          {`version: '3.8'\nservices:\n  arcadia:\n    image: ${mirror || 'docker.io/'}supermanito/arcadia:beta\n    container_name: ${containerName}\n    hostname: ${hostname}\n    tty: true\n    network_mode: ${network}\n    ports:\n      - ${port}:5678${getComposeMountLines()}`}
        </CodeBlock>
        <Heading as="h3">启动容器</Heading>
        <CodeBlock language="bash">{'podman-compose up -d'}</CodeBlock>
      </>
    )
  }

  return (
    <ConfigProvider theme={{ algorithm }}>
      <Space wrap size="small" style={{ paddingBottom: '10px', lineHeight: '0', justifyContent: 'space-between', width: '100%' }}>
        <Segmented
          options={[
            { label: isMobile ? 'V2' : 'Docker V2', value: 'docker-compose-v2', icon: <DockerIcon /> },
            { label: isMobile ? 'V1' : 'Docker V1', value: 'docker-compose-v1', icon: <DockerIcon /> },
            { label: isMobile ? 'Podman' : 'Podman', value: 'podman-compose', icon: <PodmanIcon /> },
          ]}
          value={type}
          onChange={(value) => { setType(value) }}
        />
        <Popover
          trigger={!isMobile ? 'click' : 'hover'}
          placement={!isMobile ? 'leftTop' : undefined}
          content={<PopoverContent s={s} />}
        >
          <Button type="text" color="default" variant="filled" icon={<Icon size={20}>line-md:cog-loop</Icon>} style={{ padding: '0 4px' }}>
            { !isMobile ? '高级配置' : undefined }
          </Button>
        </Popover>
      </Space>
      <div style={{ paddingTop: '1rem' }}>
        {type === 'docker-compose-v2' && <DockerCompose isV2={true} />}
        {type === 'docker-compose-v1' && <DockerCompose isV2={false} />}
        {type === 'podman-compose' && <PodmanCompose />}
      </div>
    </ConfigProvider>
  )
}

export default {
  CliInstall,
  ComposeInstall,
}
