from telethon import events
from .. import tgbot, chat_id, BOT_SET, ch_name
import random


@tgbot.on(events.NewMessage())
async def my_forward(event):
    try:
        if BOT_SET['开启机器人转发'].lower() != 'false' and event.chat_id != chat_id and str(event.chat_id) not in BOT_SET['机器人黑名单']:
            await tgbot.send_message(chat_id, f'您的机器人接收到消息。来自:```{event.chat_id}```')
            await tgbot.forward_messages(chat_id, event.id, event.chat_id)
        elif BOT_SET['开启机器人转发'].lower() != 'false' and str(event.chat_id) in BOT_SET['机器人黑名单']:
            words = BOT_SET['机器人垃圾话'].split('|')
            word = words[random.randint(0, len(words) - 1)]
            await tgbot.send_message(event.chat_id, str(word))
    except Exception as e:
        await tgbot.send_message(chat_id, str(e))


@tgbot.on(events.NewMessage(chats=chat_id, pattern=r'^/reply'))
async def my_reply(event):
    try:
        msg_text  = event.raw_text.split(' ')
        if isinstance(msg_text,list) and len(msg_text) == 3:
            text = msg_text[1:]
        else:
            text = None
        if not text:
            info = '使用方法：/reply 123455676 你想说的话'
            await tgbot.send_message(chat_id, info)
        else:
            await tgbot.send_message(int(text[0]), text[1])
    except Exception as e:
        await tgbot.send_message(chat_id, str(e))

if ch_name:
    tgbot.add_event_handler(my_reply, events.NewMessage(
        chats=chat_id, pattern=BOT_SET['命令别名']['reply']))


@tgbot.on(events.NewMessage(incoming=True, chats=chat_id))
async def resp(event):
    try:
        if event.reply_to:
            reply = await event.get_reply_message()
            if reply.fwd_from.from_id:
                await tgbot.send_message(reply.fwd_from.from_id.user_id, event.message.text)
            else:
                await tgbot.send_message(chat_id, '不能获取到对方的id，请使用/reply进行回复')
    except Exception as e:
        await tgbot.send_message(chat_id, str(e))
