import React from 'react'
import clsx from 'clsx'
import Heading from '@theme/Heading'
import { ConfigProvider, Image } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { useColorMode } from '@docusaurus/theme-common'
import { Icon } from '../../../components/Icon'
import styles from '../index.module.css'
import ImgCodeEditLight from './code-edit-light.png'
import ImgCodeEditDark from './code-edit-dark.png'
import ImgCodeDebugLight from './code-debug-light.png'
import ImgCodeDebugDark from './code-debug-dark.png'

export default function Preview () {
  const { colorMode } = useColorMode()
  const previewImg = colorMode === 'dark' ? ImgCodeEditDark : ImgCodeEditLight
  const previewImgs = colorMode === 'dark' ? [ImgCodeEditDark, ImgCodeDebugDark] : [ImgCodeEditLight, ImgCodeDebugLight]
  return (
    <section className={clsx('container', styles.features)}>
        <div className="row">
            <div className="col col--6">
                <Heading as="h2">后台管理面板</Heading>
                <div className="avatar" style={{ padding: '1em 0' }}>
                    <Icon icon="logos:naiveui" size={32} width={32} />
                    <div className="avatar__intro">
                        <div className="avatar__name">Naive UI</div>
                    </div>
                    <div style={{ paddingTop: '6px' }}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.0041 37.0001H8.52816C8.42088 37 8.31487 36.9769 8.21728 36.9324C8.11969 36.8879 8.03278 36.8229 7.9624 36.7419C7.89203 36.661 7.83983 36.5659 7.80932 36.463C7.77881 36.3602 7.7707 36.252 7.78553 36.1457L9.04719 29.0229H17.0324L15.7308 36.4013C15.6962 36.569 15.6052 36.7199 15.4731 36.8288C15.3409 36.9378 15.1754 36.9982 15.0041 37.0001Z" fill="#009BFF" />
                            <path d="M33.2341 12.9885H11.8657L13.2711 5.00336H34.352C34.4674 4.99234 34.5839 5.0085 34.6919 5.05056C34.8 5.09262 34.8967 5.1594 34.9744 5.24556C35.052 5.33172 35.1083 5.43486 35.1389 5.54672C35.1695 5.65858 35.1735 5.77605 35.1505 5.88972L33.9687 12.3897C33.9367 12.5602 33.8454 12.7138 33.7109 12.8234C33.5764 12.933 33.4075 12.9915 33.2341 12.9885Z" fill="url(#paint0_linear_736_105)" />
                            <path d="M11.8658 12.9874H4.75899C4.65026 12.9886 4.54257 12.9662 4.44336 12.9217C4.34416 12.8772 4.25581 12.8116 4.18442 12.7296C4.11304 12.6476 4.06032 12.551 4.02993 12.4467C3.99953 12.3423 3.99218 12.2325 4.00838 12.125L5.16623 5.61706C5.19786 5.44503 5.28858 5.28945 5.42271 5.17719C5.55684 5.06493 5.72596 5.00303 5.90087 5.0022H13.2712L11.8658 12.9874Z" fill="#0064FF" />
                            <path d="M17.0402 28.9987H9.03906L11.8658 13.0044H19.867L17.0402 28.9987Z" fill="url(#paint1_linear_736_105)" />
                            <defs>
                                <linearGradient id="paint0_linear_736_105" x1="12.551" y1="9.00394" x2="33.8598" y2="12.8395" gradientUnits="userSpaceOnUse">
                                    <stop offset="0.03" stopColor="#E9FFFF" />
                                    <stop offset="0.17" stopColor="#C4FAC9" />
                                    <stop offset="0.33" stopColor="#A0F694" />
                                    <stop offset="0.48" stopColor="#82F269" />
                                    <stop offset="0.63" stopColor="#6AEF47" />
                                    <stop offset="0.76" stopColor="#5AED2F" />
                                    <stop offset="0.89" stopColor="#4FEB20" />
                                    <stop offset="1" stopColor="#4CEB1B" />
                                </linearGradient>
                                <linearGradient id="paint1_linear_736_105" x1="15.8567" y1="12.4215" x2="16.0078" y2="27.4702" gradientUnits="userSpaceOnUse">
                                    <stop stopColor="#009BFF" />
                                    <stop offset="0.35" stopColor="#0081FE" />
                                    <stop offset="0.75" stopColor="#006AFD" />
                                    <stop offset="1" stopColor="#0062FD" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div className="avatar__intro">
                        <div className="avatar__name">TDesign</div>
                    </div>
                </div>
                <div className="avatar" style={{ padding: '1em 0' }}>
                    <Icon icon="logos:vue" size={32} width={32} />
                    <div className="avatar__intro">
                        <div className="avatar__name">Vue</div>
                    </div>
                    <Icon icon="logos:typescript-icon" size={32} width={32} style={{ verticalAlign: '-0.3rem' }} />
                    <div className="avatar__intro">
                        <div className="avatar__name">TypeScript</div>
                    </div>
                </div>
                <br />
                <span style={{ marginTop: '10px' }}>前沿技术编写，界面简洁美观、功能强大。</span>
            </div>
            <div className="col col--6 pt-20 lg:pt-0">
                <div className="video-container">
                    <ConfigProvider locale={zhCN}>
                        <Image.PreviewGroup
                            items={previewImgs}
                        >
                            <Image src={previewImg} />
                        </Image.PreviewGroup>
                    </ConfigProvider>
                </div>
            </div>
        </div>
    </section>
  )
}
