import React, { useRef, useState } from 'react'
import type { InputRef } from 'antd'
import { Button, Col, Checkbox, Divider, Flex, Input, InputNumber, Popover, Row, Segmented, Space, Select, Switch, Tooltip, ConfigProvider, theme } from 'antd'
import { DockerIcon, PodmanIcon, Icon } from '../Icon'
import CodeBlock from '@theme/CodeBlock'
import { useColorMode, useWindowSize } from '@docusaurus/theme-common'

export default function CliInstall () {
  const windowSize = useWindowSize()
  const isMobile = windowSize === 'mobile'

  const { colorMode } = useColorMode() // ConfigProvider 主题
  const [type, setType] = useState('docker') // 类型
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
  const mountPrefix = useCurrentDir ? '$(pwd)' : '/opt/arcadia' // 根据状态变量决定挂载路径前缀
  const mountLines = selectedMounts.length > 0 ? '\n' + selectedMounts.map(mount => `-v ${mountPrefix}/${mount}:/arcadia/${mount} \\`).join('\n') : ''

  function Docker () {
    return (
      <CodeBlock language="bash">
        {`docker run -dit \\
--name ${containerName} \\
--hostname ${hostname} \\
--network ${network} \\
--restart always \\
-p ${port}:5678 \\${mountLines}
${backupMirrortChecked ? 'registry.cn-hangzhou.aliyuncs.com/' : ''}supermanito/arcadia:beta`}
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
-p ${port}:5678 \\${mountLines}
${backupMirrortChecked ? 'registry.cn-hangzhou.aliyuncs.com/' : 'docker.io/'}supermanito/arcadia:beta`}
      </CodeBlock>
    )
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: colorMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <Space wrap size="small" style={{ paddingBottom: '10px', lineHeight: '0' }}>
        <Segmented
          style={{ userSelect: 'none' }}
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
                              <Icon size="16px" style={{ verticalAlign: '-0.25em' }}>mdi:plus</Icon>
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
            <Button type="text" shape="circle" size="small" style={{ padding: '2px' }}>
              <Icon size="18" style={{ verticalAlign: '-0.2rem' }}>ic:outline-settings</Icon>
            </Button>
          </Popover>
        </Tooltip>
      </Space>
      {type === 'docker' && <Docker />}
      {type === 'podman' && <Podman />}
    </ConfigProvider>
  )
}
