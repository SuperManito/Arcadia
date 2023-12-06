# WSKEY
wskey 是**移动端APP**特有 Cookie 参数值，用于长期使用

:::danger 注意

**注销登录**（在抓取设备的APP中手动操作退出账号登录）、**修改密码**会导致其失效，若想在APP中切换账号直接卸载APP即可，极少数情况下存在被官方主动踢下线的可能性

:::

目前 WSKEY 的有效期为半年起步，具体有效时间暂时未知，配置后可转换生成有效期为 `5` 个小时左右的 `pt_key`

:::warning 声明
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

  - ### 更新指令

    ```bash
    task cookie update
    ```

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
