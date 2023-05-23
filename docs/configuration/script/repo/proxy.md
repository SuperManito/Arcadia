---
title: 仓库代理
---

由于国内网络环境经常无法访问 [GitHub](https://github.com) ，因此可能需要配置代理以满足日常使用，本篇介绍二种解决方案，有魔法的朋友请忽略本篇内容

## Socks5 自建代理

:::info 必要条件
需要一台能够访问 GitHub 的设备
:::

:::caution 部分国内云计算厂商不可用
目前已知腾讯云官方曾利用自动化程序大规模扫描用户服务器端口，会封禁违规设备的端口和IP  
由于协议过于明显，防火墙限制策略、卸载厂商监控、重装系统等操作可能均无法抵挡平台的主动检测
:::

### 懒人部署方法

在服务器通过 Docker CLI 一键启动 **Socks5** 代理容器，请将命令中的 `<xxx>` 修改为你的配置信息

```bash {2-4}
docker run -d \
-p <自定义端口号>:1080 \
-e PROXY_USER=<自定义用户名> \
-e PROXY_PASSWORD=<自定义密码> \
-e PROXY_SERVER=0.0.0.0:1080 \
--name socks5 \
--restart always \
xkuma/socks5
```
不一定必须使用此方法部署 Socks5 代理服务，你也可以使用自己的

### 配置方法

配置 Git 基于 `github.com` 域名的全局代理（容器内执行）

```bash
git config --global http.https://github.com.proxy socks5h://<用户名>:<密码>@<地址>:<端口>
git config --global https.https://github.com.proxy socks5h://<用户名>:<密码>@<地址>:<端口>
```

地址示例：`socks5h://user:password@127.0.0.1:1080`  
如果没有配置用户名和密码，那么把其去掉即可，即 `socks5h://127.0.0.1:1080`

#### 如何取消配置？

```bash
git config --global --unset http.https://github.com.proxy
git config --global --unset https.https://github.com.proxy
```

### 使用方法

配置后即代表已全局代理GitHub，无需对链接进行处理，需要注意的是此代理仅作用于拉取仓库上，无法在单独拉取脚本时使用

:::danger
**Socks5** 代理特征明显容易被墙，强烈建议配合IP限制策略使用，即配置服务端口仅允许你设备的流量通过，限制后会非常稳定
:::


## Cloudflare 自建代理

该方法部署简单并且可以完全白嫖，[Cloudflare](https://www.cloudflare.com/zh-cn) 是一家国际知名的CDN服务商

:::caution 有限的使用
很遗憾，Cloudflare 默认 Workers 子域名已于近期被长城防火墙列入黑名单，但仍可以在创建后通过DNS功能添加个人域名解析以进行使用
:::

### 注册 Cloudflare

https://dash.cloudflare.com/sign-up

如果已有账号则忽略该步骤，直接进行下一步（可能部分地区官网访问较慢，注册账号需要邮件验证）

### 创建 Workers

#### 1. 进入面板点击创建服务

![1](./cloudflare/1.png)  
![2](./cloudflare/2.png ':size=1050x450')

#### 2. 自行定义网站前缀名

![3](./cloudflare/3.png ':size=1050x450')
![4](./cloudflare/4.png ':size=1050x150')

#### 3. 创建后点击快速编辑

![5](./cloudflare/5.png ':size=1050x450')

#### 4. 复制下面的代码，覆盖原有默认内容


<details>

<summary>点击此处展开代码 👈</summary>

```javascript
'use strict'

/**
 * static files (404.html, sw.js, conf.js)
 */
const ASSET_URL = 'https://github.com/'
// 前缀，如果自定义路由为example.com/gh/*，将PREFIX改为 '/gh/'，注意，少一个杠都会错！
const PREFIX = '/'
const Config = {
    jsdelivr: 0,
    cnpmjs: 0
}

/** @type {RequestInit} */
const PREFLIGHT_INIT = {
    status: 204,
    headers: new Headers({
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,PATCH,TRACE,DELETE,HEAD,OPTIONS',
        'access-control-max-age': '1728000',
    }),
}

const exp1 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:releases|archive)\/.*$/i
const exp2 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:blob|raw)\/.*$/i
const exp3 = /^(?:https?:\/\/)?github\.com\/.+?\/.+?\/(?:info|git-).*$/i
const exp4 = /^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+?\/.+$/i
const exp5 = /^(?:https?:\/\/)?gist\.(?:githubusercontent|github)\.com\/.+?\/.+?\/.+$/i

/**
 * @param {any} body
 * @param {number} status
 * @param {Object<string, string>} headers
 */
function makeRes(body, status = 200, headers = {}) {
    headers['access-control-allow-origin'] = '*'
    return new Response(body, {status, headers})
}

/**
 * @param {string} urlStr
 */
function newUrl(urlStr) {
    try {
        return new URL(urlStr)
    } catch (err) {
        return null
    }
}

addEventListener('fetch', e => {
    const ret = fetchHandler(e)
        .catch(err => makeRes('cfworker error:\n' + err.stack, 502))
    e.respondWith(ret)
})

function checkUrl(u) {
    for (let i of [exp1, exp2, exp3, exp4, exp5, ]) {
        if (u.search(i) === 0) {
            return true
        }
    }
    return false
}

/**
 * @param {FetchEvent} e
 */
async function fetchHandler(e) {
    const req = e.request
    const urlStr = req.url
    const urlObj = new URL(urlStr)
    let path = urlObj.searchParams.get('q')
    if (path) {
        return Response.redirect('https://' + urlObj.host + PREFIX + path, 301)
    }
    // cfworker 会把路径中的 `//` 合并成 `/`
    path = urlObj.href.substr(urlObj.origin.length + PREFIX.length).replace(/^https?:\/+/, 'https://')
    if (path.search(exp1) === 0 || path.search(exp5) === 0 || !Config.cnpmjs && (path.search(exp3) === 0 || path.search(exp4) === 0)) {
        return httpHandler(req, path)
    } else if (path.search(exp2) === 0) {
        if (Config.jsdelivr) {
            const newUrl = path.replace('/blob/', '@').replace(/^(?:https?:\/\/)?github\.com/, 'https://cdn.jsdelivr.net/gh')
            return Response.redirect(newUrl, 302)
        } else {
            path = path.replace('/blob/', '/raw/')
            return httpHandler(req, path)
        }
    } else if (path.search(exp3) === 0) {
        const newUrl = path.replace(/^(?:https?:\/\/)?github\.com/, 'https://github.com.cnpmjs.org')
        return Response.redirect(newUrl, 302)
    } else if (path.search(exp4) === 0) {
        const newUrl = path.replace(/(?<=com\/.+?\/.+?)\/(.+?\/)/, '@$1').replace(/^(?:https?:\/\/)?raw\.(?:githubusercontent|github)\.com/, 'https://cdn.jsdelivr.net/gh')
        return Response.redirect(newUrl, 302)
    } else {
        return fetch(ASSET_URL + path)
    }
}

/**
 * @param {Request} req
 * @param {string} pathname
 */
function httpHandler(req, pathname) {
    const reqHdrRaw = req.headers

    // preflight
    if (req.method === 'OPTIONS' &&
        reqHdrRaw.has('access-control-request-headers')
    ) {
        return new Response(null, PREFLIGHT_INIT)
    }

    const reqHdrNew = new Headers(reqHdrRaw)

    let urlStr = pathname
    if (urlStr.startsWith('github')) {
        urlStr = 'https://' + urlStr
    }
    const urlObj = newUrl(urlStr)

    /** @type {RequestInit} */
    const reqInit = {
        method: req.method,
        headers: reqHdrNew,
        redirect: 'manual',
        body: req.body
    }
    return proxy(urlObj, reqInit)
}

/**
 *
 * @param {URL} urlObj
 * @param {RequestInit} reqInit
 */
async function proxy(urlObj, reqInit) {
    const res = await fetch(urlObj.href, reqInit)
    const resHdrOld = res.headers
    const resHdrNew = new Headers(resHdrOld)

    const status = res.status

    if (resHdrNew.has('location')) {
        let _location = resHdrNew.get('location')
        if (checkUrl(_location))
            resHdrNew.set('location', PREFIX + _location)
        else {
            reqInit.redirect = 'follow'
            return proxy(newUrl(_location), reqInit)
        }
    }
    resHdrNew.set('access-control-expose-headers', '*')
    resHdrNew.set('access-control-allow-origin', '*')

    resHdrNew.delete('content-security-policy')
    resHdrNew.delete('content-security-policy-report-only')
    resHdrNew.delete('clear-site-data')

    return new Response(res.body, {
        status,
        headers: resHdrNew,
    })
}
```

</details>

![6](./cloudflare/6.png ':size=1050x450')

#### 5. 测试请求是否反代成功

![7](./cloudflare/7.png ':size=1050x450')
![8](./cloudflare/8.png ':size=1050x450')

#### 6. 保存并部署

![9](./cloudflare/9.png)  
![10](./cloudflare/10.png)

到这里就搭建完成了，你的代理是 `https://<服务名>.<用户名>.workers.dev/`

### 使用方法

在原有链接地址前面加上你的代理地址，例如 https://github.user.workers.dev/https://github.com/User/Repo.git
