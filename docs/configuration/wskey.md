# WSKEY
wskey 是**移动端APP**特有 Cookie 参数值，用于长期使用，本项目拥有最新版本且全网最稳定的转换脚本

:::caution 注意

**注销登录**（在抓取设备的APP中手动操作退出账号登录）、**修改密码**会导致其失效，若想在APP中切换账号直接卸载APP即可，极少数情况下存在被官方主动踢下线的可能性

:::

目前 WSKEY 的有效期为半年起步，具体有效时间暂时未知，配置后可转换生成有效期为 `5` 个小时左右的 `pt_key`

:::caution 声明
该转换脚本是本项目中唯一的加密脚本位于 **utils/UpdateCookie.js**，为了防止被滥用已局部加密关于**获取签名**部分的代码，该脚本为**本地转换**，没有加密转换部分的代码，其它任何通过在线获取签名的转换脚本均存在账号泄露的风险，作者承诺该脚本乃至整个项目均没有任何上传行为，可自行抓包验证随时接受检验，我们始终保留对造谣者追究的权力
:::

## 配置方法

- ### 基础配置

  :::note 后台管理面板入口
  编辑配置 - 下拉选择 `account.json`
  :::

  建议通过面板进行编辑，有格式检测可以减少配置出错，注意 `pt_pin` 和 `ws_key` 填入的是对应的值，不要把格式和标点符号带进去

  - #### 编辑位于 **config** 目录下的 **account.json** 配置文件

    ```json
    [
      {
        "pt_pin": "user_α",
        "ws_key": "xxxxxxxxxxxxxxxxxxxxx",
        "remarks": "阿尔法",
        "phone": "",
        "config": {
          "ep": {}
        }
      },
      {
        "pt_pin": "user_β",
        "ws_key": "xxxxxxxxxxxxxxxxxxxxx",
        "remarks": "贝塔",
        "phone": "",
        "config": {
          "ep": {}
        }
      },
      {
        "pt_pin": "",
        "ws_key": "",
        "remarks": "",
        "phone": "",
        "config": {
          "ep": {}
        }
      }
    ]
    ```

    :::info
    `remarks` 通知备注，会在适配脚本的推送消息中将用户名昵称换成备注名称  
    `phone` 联系方式备注，显示在主配置文件账号变量下方备注内容  
    `ep` 设备信息，对于目前来说可填可不填没有实际意义，一般出现在请求的 **Body** 中  
    `pt_pin` 用户名，目前在APP的部分请求中已被加密可能无法通过抓包有效获取，可前往账号设置进行查看，如果用户名含有中文汉字需转换成 `UrlEncode`
    :::

  - ### 定时设置

    项目已配置定时任务但默认被注释，如需使用请自行取消注释并参考使用建议

    :::tip
    更新频率由你的账号数量决定，目前建议每天更新`六`次即每4小时更新一次
    :::

    ```cron
    <自定义分钟> 2,6,10,14,18,22 * * * sleep $((${RANDOM} % 56)) && task cookie update >/dev/null 2>&1
    ```
    :::danger 注意合理规划更新账号的定时任务
    部分脚本执行时间过长可能导致pt_key在执行期间过期失效，因此应在这类脚本执行前进行更新  
    如果短时间内频繁使用或一天内转换次数过多可能会被官方限制IP地址(至少持续一周)，不要滥用
    :::

  - ### 功能设置

    - #### 更新账号推送通知功能

      ```bash
      EnableCookieUpdateNotify=""
      ```
      控制当使用 WSKEY 更新 Cookie 后是否推送更新结果内容，默认不推送，如想要接收推送通知提醒请赋值为 `true`

    - #### 更新账号异常告警功能

      ```bash
      EnableCookieUpdateFailureNotify=""
      ```
      控制当使用 WSKEY 更新 Cookie 失败后是否推送通知提醒，以用于快速处理失效的 WSKEY，默认不推送，如想要接收推送通知提醒请赋值为 `true`


## 抓包获取

  - ### iOS/iPadOS

    安装：从 App Store 下载 [Stream](https://apps.apple.com/cn/app/stream/id1312141691) ，然后打开 Stream - HTTPS抓包 - 根据提示安装证书并信任

    抓包：在 Stream 主界面点击开始抓包，打开 JD 主 APP 并从底栏中点击我的（如果后台已有则需要退出并重新打开一个新的），然后返回 Stream - 抓包历史 - 按域名 - `api.m.jd.com`
  
    方法：从列出来的请求列表中点击任意一个请求进入抓包详情界面进行查看，在请求（顶栏） - 请求头部 - 内容中找到 `Cookies:` ，在其中寻找 wskey，一般 Cookies 内容的第一行就是，wskey 不是所有请求里都有如果没有就换一个继续找
  
  - ### Android

    建议通过 HttpCanary 小黄鸟 App 进行抓包，方式与上方苹果设备类似，不过限制较多导致门槛较高，建议使用下方教程中的 AnyProxy 协助抓取


## 协助抓取
此方法旨在为帮助他人抓取WSKEY，需要一台能够通过公网访问的 Linux 环境，基于 [AnyProxy - 由阿里发布的开源抓包工具](https://github.com/alibaba/anyproxy)  
如果是本地操作借助一些专业工具即可无需使用此方法，例如安卓：Httpcanary；IOS：Stream、Thor 等App

- ### 安装 Nodejs 和 npm 环境

  如果已安装则忽略该步骤

  - #### 安装 Nodejs

    由于 NodeSource 没有国内源，下载速度可能较慢，会附带安装 npm

    - ##### Debian/Ubuntu/Kali

      ```bash
      curl -sL https://deb.nodesource.com/setup_18.x | bash -
      apt-get install -y nodejs
      ```

    - ##### RHEL/CentOS/Fedora

      ```bash
      curl -sL https://rpm.nodesource.com/setup_18.x | bash -
      yum install -y nodejs
      ```
  
  - #### npm 切换国内源

    ```bash
    npm config set registry https://registry.npmmirror.com
    ```
    如果没有国际互联网环境建议切换为国内淘宝源

- ### 安装并配置 AnyProxy

  - #### 安装

    ```bash
    npm install -g anyproxy
    ```

  - #### 生成证书

    ```bash
    anyproxy-ca
    ```
    一路回车

  - #### 启动服务

    ```bash
    anyproxy --intercept
    ```
    `Ctrl + C` 停止运行，由于代理了所有 [HTTPS 请求](http://anyproxy.io/cn/#%E4%BB%A3%E7%90%86https)，可能存在服务报错中断的情况，同时设备连接代理后网络会变慢请耐心等待加载完毕

- ### 使用方法

  - #### 客户端（对方）操作

    :::tip
    一共三步，请认真阅读自己设备对应操作系统的教程
    :::
   
    - ##### 1. 安装证书

      不要通过 Safari

      系统浏览器打开 [http://\<ip\>:8002](http://<ip>:8002) 左侧 RootCA - Download 下载证书文件，如果出现让你选择文件则选择第一个 `rootCA.crt`

      - ###### iOS/iPadOS
        下载后弹窗点击允许，如果没有自动弹窗那么就从下载历史里点一下，然后打开设置 - 已下载描述文件(Apple账号下方) - 安装，安装完成后转到通用 - 关于本机 - 证书信任设置 - 针对根证书启用完全信任 - 启用 AnyProxy

      - ###### Android
        从本地文件管理或浏览器下载记录中点击已下载的证书文件，会自动弹出系统自带的证书安装器（可能会让你选择打开程序方式），填写名称为 AnyProxy 或随便起个，类型保持默认选择用于Wi-Fi
   
    - ##### 2. 配置代理

      - ###### iOS/iPadOS
        设置 - 无线局域网 - 点击已连接Wi-Fi右边的感叹号 - 配置HTTP代理(下划至底部) - 选择手动

      - ###### Android
        系统设置 - WLAN - 长按已连接的Wi-Fi进入配置找到配置代理选项(各品牌OS界面不同自行判断) - 选择手动

      :::info 代理具体配置内容
      主机名：`<ip>`  
      端口：`8001`  
      没有用户名和密码
      :::

      通过专业软件连接代理也是可以的，运营商网络也支持配置代理，不过最方便的还是通过Wi-Fi连接，因为对方不一定懂这些

    - ##### 3. 打开JD APP

      如果是更新账号，则需要先在设置中退出（手动注销）已经登录的账号，然后再重新登录一下，否则抓取的可能仍是旧的

      如果之前打开过则需要从后台关掉重新打开一个新的，如果前两步操作正确APP会正常联网否则就加载不出来内容，然后点击 `我的` 随便划一划等待加载出用户信息

  - #### 服务提供者（你）操作

    打开 [http://localhost:8002](http://localhost:8002) 进入 AnyProxy 面板查看关于 `api.m.jd.com` 域名链接特别长的 POST 请求，`wskey`会出现在 Cookies 中

    抓到后联系对方关闭代理即可，证书删不删无所谓没有任何影响（部分安卓手机可能会在锁屏界面出现关于安装第三方证书的网络警告），如果短期内仍有使用需求的话则建议保留

    AnyProxy 面板有内容说明代理连接正常，如果请求中没有 `Header` 内容或者客户端断网说明证书安装异常，已知某为手机容易出现APP断网的情况原因暂时未知...
