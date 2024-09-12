/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { type ReactNode } from 'react'
import Link from '@docusaurus/Link'

interface ProfileProps {
  className?: string
  name: string
  children: ReactNode
  githubUrl: string
  twitterUrl?: string
}

function TeamProfileCard ({ className, name, children, githubUrl, twitterUrl }: ProfileProps) {
  return (
    <div className={className}>
        <div className="card card--full-height">
            <div className="card__header">
                <div className="avatar">
                    <img className="avatar__photo" src={`${githubUrl}.png`} alt={`${name}'s avatar`} />
                    <div className="avatar__intro">
                        <div className="avatar__name">{name}</div>
                        <small className="avatar__subtitle">{children}</small>
                    </div>
                </div>
            </div>
            <div className="card__footer">
                <div className="button-group button-group--block">
                    {githubUrl && (
                        <Link className="button button--secondary" href={githubUrl}>
                            GitHub
                        </Link>
                    )}
                    {twitterUrl && (
                        <Link className="button button--secondary" href={twitterUrl}>
                            Twitter
                        </Link>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}

function TeamProfileCardCol (props: ProfileProps) {
  return <TeamProfileCard {...props} className="col col--6 margin-bottom--lg" />
}

export function ActiveTeamRow (): JSX.Element {
  return (
    <div className="row">
        <TeamProfileCardCol name="Super Manito" githubUrl="https://github.com/SuperManito">
            项目创始人，全栈开发者兼总设计师。熟悉使用众多编程语言，他不仅人长得帅敲代码也很厉害~
        </TeamProfileCardCol>
        <TeamProfileCardCol name="mzzsfy" githubUrl="https://github.com/mzzsfy">
            后端开发者，架构工程师。
        </TeamProfileCardCol>
    </div>
  )
}
