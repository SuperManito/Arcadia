import React from 'react'
import { Button, Col, Row, Space, ConfigProvider, theme } from 'antd'
import Link from '@docusaurus/Link'
import { useColorMode, useWindowSize } from '@docusaurus/theme-common'
import { Icon } from '../Icon'

export function OpenAPICard () {
  const windowSize = useWindowSize()
  const isMobile = windowSize === 'mobile'
  const ApifoxHerf = 'https://arcadia.apifox.cn'
  const SwaggerHerf = '/swagger.html'

  const { colorMode } = useColorMode()
  const Default = (
    <Row gutter={16}>
        <Col span={12}>
            <Link href={ApifoxHerf} target="_blank" rel="noreferrer">
                <Button size="large" type="text" block style={{ height: '64px' }}>
                    <Space>
                        <img src="https://cdn.apifox.com/logo/apifox-logo-512.png" className="mr-2" style={{ width: '48px', height: '48px', verticalAlign: '-0.6em' }} />
                    </Space>
                    <div style={{ marginBottom: '8px', fontSize: '32px' }}>Apifox</div>
                </Button>
            </Link>
        </Col>
        <Col span={12}>
            <Link href={SwaggerHerf} target="_blank" rel="noreferrer">
                <Button size="large" type="text" block style={{ height: '64px' }}>
                    <Space>
                        <Icon icon="devicon:swagger" size="48px" style={{ marginRight: '0.15em', marginTop: '0.25em' }}></Icon>
                    </Space>
                    <div style={{ marginBottom: '8px', fontSize: '32px' }}>SwaggerUI</div>
                </Button>
            </Link>
        </Col>
    </Row>
  )
  const Mobile = (
    <Space>
        <Link href={ApifoxHerf} target="_blank" rel="noreferrer">
            <Button size="large" type="text" block style={{ height: '48px' }}>
                <Space>
                    <img src="https://cdn.apifox.com/logo/apifox-logo-512.png" style={{ width: '32px', height: '32px', verticalAlign: '-0.4em' }} />
                </Space>
                <div style={{ marginBottom: '6px', fontSize: '24px' }}>Apifox</div>
            </Button>
        </Link>
        <Link href={SwaggerHerf} target="_blank" rel="noreferrer">
            <Button size="large" type="text" block style={{ height: '48px' }}>
                <Space>
                    <Icon icon="devicon:swagger" size="32px" style={{ marginTop: '0.15em' }}></Icon>
                </Space>
                <div style={{ marginBottom: '4px', fontSize: '24px' }}>Swagger</div>
            </Button>
        </Link>
    </Space>
  )
  return (
    <ConfigProvider
      theme={{
        algorithm: colorMode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
    {!isMobile ? Default : Mobile}
    </ConfigProvider>
  )
}
