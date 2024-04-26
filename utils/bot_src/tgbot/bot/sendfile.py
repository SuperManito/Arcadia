from telethon import events
from .. import LOG_DIR, tgbot, chat_id, LOG_DIR, ARCADIA_DIR, BOT_SET, ch_name
from .utils import log_btn
import os


@tgbot.on(events.NewMessage(from_users=chat_id, pattern=r'^/log'))
async def bot_log(event):
    '''定义日志文件操作'''
    SENDER = event.sender_id
    path = LOG_DIR
    page = 0
    filelist = None
    async with tgbot.conversation(SENDER, timeout=60) as conv:
        msg = await conv.send_message('🕙 正在查询，请稍后...')
        while path:
            path, msg, page, filelist = await log_btn(conv, SENDER, path, msg, page, filelist)

@tgbot.on(events.NewMessage(from_users=chat_id, pattern=r'^/botlog'))
async def bot_run_log(event):
    '''定义日志文件操作'''
    await tgbot.send_message(chat_id,'bot运行日志',file=f'{LOG_DIR}/TelegramBot/run.log')


@tgbot.on(events.NewMessage(from_users=chat_id, pattern=r'^/getfile'))
async def bot_getfile(event):
    '''定义获取文件命令'''
    SENDER = event.sender_id
    path = ARCADIA_DIR
    page = 0
    msg_text = event.raw_text.split(' ')
    if len(msg_text) == 2:
        text = msg_text[-1]
    else:
        text = None
    if text and os.path.isfile(text):
        await tgbot.send_message(chat_id, '请查收文件', file=text)
        return
    elif text and os.path.isdir(text):
        path = text
        filelist = None
    elif text:
        await tgbot.send_message(chat_id, 'please marksure it\'s a dir or a file')
        filelist = None
    else:
        filelist = None
    async with tgbot.conversation(SENDER, timeout=60) as conv:
        msg = await conv.send_message('🕙 正在查询，请稍后...')
        while path:
            path, msg, page, filelist = await log_btn(conv, SENDER, path, msg, page, filelist)

if ch_name:
    tgbot.add_event_handler(bot_getfile, events.NewMessage(
        from_users=chat_id, pattern=BOT_SET['命令别名']['getfile']))
    tgbot.add_event_handler(bot_log, events.NewMessage(
        from_users=chat_id, pattern=BOT_SET['命令别名']['log']))
