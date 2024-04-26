from telethon import events
from .. import tgbot, START_CMD, chat_id, logger, BOT_SET, ch_name
from .utils import cmd, ARCADIA_CMD


@tgbot.on(events.NewMessage(from_users=chat_id, pattern='/cmd'))
async def my_cmd(event):
    """接收/cmd命令后执行程序"""
    logger.info('开始执行 ' +  event.raw_text.split('\n')[0] + ' 命令')
    msg_text = event.raw_text.split(' ')
    try:
        if isinstance(msg_text, list):
            text = ' '.join(msg_text[1:])
        else:
            text = None
        if START_CMD and text:
            await cmd(text)
        elif START_CMD:
            msg = f'''请正确使用/cmd命令，如
            /cmd {ARCADIA_CMD}                # 查看命令帮助
            '''
            await tgbot.send_message(chat_id, msg)
        else:
            await tgbot.send_message(chat_id, '未开启CMD命令，如需使用请修改配置文件')
        logger.info('执行' + event.raw_text.split('\n')[0] + ' 命令完毕')
    except Exception as e:
        await tgbot.send_message(chat_id, f'something wrong,I\'m sorry\n{str(e)}')
        logger.error(f'发生了某些错误\n{str(e)}')


if ch_name:
    tgbot.add_event_handler(my_cmd, events.NewMessage(
        chats=chat_id, pattern=BOT_SET['命令别名']['cmd']))
