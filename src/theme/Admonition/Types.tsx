import React from 'react'
import DefaultAdmonitionTypes from '@theme-original/Admonition/Types'

function PrimaryAdmonition (props: any): any {
  const content = (Boolean((props.children?.props?.children))) && props.children.props.children.length > 0 ? (props.children.props.children[0].props.children) as string : props.children
  return (
    <div className="alert alert--primary" style={{ marginBottom: '1.25em' }} role="alert">
      <div className="admonitionContent">
        {content}
      </div>
    </div>
  )
}

function SuccessAdmonition (props: any): any {
  const content = (Boolean((props.children?.props?.children))) && props.children.props.children.length > 0 ? (props.children.props.children[0].props.children) as string : props.children
  return (
    <div className="alert alert--success" style={{ marginBottom: '1.25em' }} role="alert">
      <div className="admonitionContent">
        {content}
      </div>
    </div>
  )
}

const AdmonitionTypes = {
  ...DefaultAdmonitionTypes,
  // 自定义
  primary: PrimaryAdmonition,
  success: SuccessAdmonition,
}

export default AdmonitionTypes
