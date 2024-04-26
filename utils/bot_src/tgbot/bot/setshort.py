from telethon import events
from .. import tgbot, chat_id, SHORTCUT_FILE, BOT_SET, ch_name
from .utils import ARCADIA_CMD


@tgbot.on(events.NewMessage(from_users=chat_id, pattern=r'^/setshort$'))
async def bot_set_short(event):
    SENDER = event.sender_id
    info = f'60s内回复有效\n请按格式输入您的快捷命令。例如：\n更新脚本-->{ARCADIA_CMD} update\n'
    info += '\n回复`cancel`或`取消`即可取消本次对话'
    async with tgbot.conversation(SENDER, timeout=180) as conv:
        msg = await conv.send_message(info)
        shortcut = await conv.get_response()
        if shortcut.raw_text == 'cancel' or shortcut.raw_text == '取消':
            await tgbot.delete_messages(chat_id,msg)
            await tgbot.send_message(chat_id, '对话已取消')
            conv.cancel()
            return
        with open(SHORTCUT_FILE, 'w+', encoding='utf-8') as f:
            f.write(shortcut.raw_text)
        await conv.send_message('已设置成功可通过"/a或/b"使用')
        conv.cancel()

if ch_name:
    tgbot.add_event_handler(bot_set_short, events.NewMessage(
        from_users=chat_id, pattern=BOT_SET['命令别名']['setshort']))
