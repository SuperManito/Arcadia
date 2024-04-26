from telethon import events
from .. import tgbot, chat_id,ch_name
from .utils import ARCADIA_CMD


@tgbot.on(events.NewMessage(from_users=chat_id, pattern='/start'))
async def bot_start(event):
    '''接收/start命令后执行程序'''
    msg = f'''使用方法如下：
    /help 获取全部支持的命令，可直接发送至BotFather命令设置（Edit Bot - Edit Commands）菜单。
    /start 开始使用本程序。
    /a 使用你的自定义快捷按钮。
    /clearboard 删除快捷输入按钮。
    /cmd 在系统命令行执行指令，例：/cmd {ARCADIA_CMD} 查看命令帮助。
    /dl 下载文件，例：/dl 
    /edit 从目录选择文件并编辑，需要将编辑好信息全部发给BOT，BOT会根据你发的信息进行替换。建议仅编辑config，其他文件慎用！
    /getfile 获取项目文件。
    /log 查看代码执行日志。
    /set 设置Bot部分功能。
    /setname 设置命令别名。
    /setshort 设置自定义按钮，每次设置会覆盖原设置。
    /run 选择代码文件运行，支持所有路径，选择完后直接后台运行，不影响BOT响应其他命令。

    直接发送文件至BOT，会让您选择保存到目标文件夹，支持保存并运行。'''
    await tgbot.send_message(chat_id, msg)

if ch_name:
    tgbot.add_event_handler(bot_start,events.NewMessage(from_users=chat_id, pattern='开始'))
