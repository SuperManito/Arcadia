/* eslint-disable @typescript-eslint/no-var-requires */
import React from 'react'
import clsx from 'clsx'
import { Icon } from '@iconify/react'
import Link from '@docusaurus/Link'
import Heading from '@theme/Heading'
import styles from './styles.module.css'

const FeatureList = [
  {
    title: '文件内容编辑',
    Svg: require('@site/static/img/HomePageFeatures/MdiNoteEditOutline.svg').default,
    description: (
      <>
        支持对文件内容进行在线编辑，编辑器采用自为 <Icon icon="vscode-icons:file-type-vscode" height="20" style={{ verticalAlign: '-0.15em' }}></Icon> <b><Link href="https://github.com/microsoft/vscode" target="_blank" rel="noreferrer">Visual Studio Code</Link></b> 提供支持的 <b><Link href="https://microsoft.github.io/monaco-editor" target="_blank" rel="noreferrer">Monaco Editor</Link></b>，并且经过了我们的高度定制，提供众多语言解释器支持。
      </>
    ),
  },
  {
    title: '定时任务调度',
    Svg: require('@site/static/img/HomePageFeatures/MdiClockPlusOutline.svg').default,
    description: <>通过数据表格页面进行管理操作，增删改查一应俱全，支持秒级任务、即时调试、查看历史日志、标签页分类、仓库过滤等功能。</>,
  },
  {
    title: '运行日志查询',
    Svg: require('@site/static/img/HomePageFeatures/MdiTextBoxSearchOutline.svg').default,
    description: <>支持使用文件名称搜索过滤、使用日期选择器组件进行指定日期范围查询，支持日志的高亮显示以及实时调整日志的字体大小。</>,
  },
  {
    title: '文件维护管理',
    Svg: require('@site/static/img/HomePageFeatures/MdiFileCodeOutline.svg').default,
    description: <>支持常见文件管理操作可管理项目的绝大部分文件，支持脚本在线调试运行并且可配置运行参数。</>,
  },
  {
    title: '集成终端工具',
    Svg: require('@site/static/img/HomePageFeatures/MdiCodeTags.svg').default,
    description: (
      <>
        集成基于 <b><Link href="https://xtermjs.org/" target="_blank" rel="noreferrer">Xterm.js</Link></b> 的网页终端工具，实时、流畅，支持标签页多开。
      </>
    ),
  },
  {
    title: '文件内容对比',
    Svg: require('@site/static/img/HomePageFeatures/MdiFileCompare.svg').default,
    description: (
      // eslint-disable-next-line @docusaurus/no-untranslated-text
      <>
        集成自 <b><Link href="https://microsoft.github.io/monaco-editor" target="_blank" rel="noreferrer">Monaco Editor</Link></b> 的专业差异编辑器，对比文件可选，支持多种对比模式。
      </>
    ),
  },
]

// eslint-disable-next-line react/prop-types
function Feature ({ Svg, title, description }: any) {
  return (
    <div className={clsx('col col--4')}>
      <div className="padding-horiz--md padding-bottom--md">
        <div className={styles.featureIcon}>{Svg ? <Svg alt={title} /> : null}</div>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  )
}

export default function HomepageFeatures () {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  )
}
