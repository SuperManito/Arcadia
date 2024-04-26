from telethon import events
from .. import tgbot, chat_id, ARCADIA_DIR, BOT_SET, ch_name
from .utils import cmd, run_btn


@tgbot.on(events.NewMessage(from_users=chat_id, pattern=r'^/run'))
async def my_run(event):
    '''定义run命令'''
    SENDER = event.sender_id
    path = ARCADIA_DIR
    page = 0
    filelist = None
    async with tgbot.conversation(SENDER, timeout=60) as conv:
        msg = await conv.send_message('🕙 正在查询，请稍后...')
        while path:
            path, msg, page, filelist = await run_btn(conv, SENDER, path, msg, page, filelist)
    if filelist and filelist.startswith('CMD-->'):
        await cmd(filelist.replace('CMD-->', ''))

if ch_name:
    tgbot.add_event_handler(my_run, events.NewMessage(
        from_users=chat_id, pattern=BOT_SET['命令别名']['run']))
