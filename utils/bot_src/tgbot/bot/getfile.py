from telethon import events, Button
from asyncio import exceptions
from .. import tgbot, chat_id, SCRIPTS_DIR, CONFIG_DIR, logger
from .utils import press_event, backup_file, cmd, ARCADIA_CMD

@tgbot.on(events.NewMessage(from_users=chat_id))
async def bot_get_file(event):
    '''定义文件操作'''
    try:
        btn = [[Button.inline('放入config', data=CONFIG_DIR), Button.inline('放入scripts', data=SCRIPTS_DIR)], [
            Button.inline('放入scripts并运行', data='node'), Button.inline('取消', data='cancel')]]
        SENDER = event.sender_id
        if event.message.file:
            markup = []
            filename = event.message.file.name
            cmdtext = None
            async with tgbot.conversation(SENDER, timeout=180) as conv:
                msg = await conv.send_message('请选择您要放入的文件夹或操作：\n')
                markup = btn
                msg = await tgbot.edit_message(msg, '请选择您要放入的文件夹或操作：', buttons=markup)
                convdata = await conv.wait_event(press_event(SENDER))
                res = bytes.decode(convdata.data)
                markup = [Button.inline('是', data='yes'),
                          Button.inline('否', data='no')]
                if res == 'cancel':
                    msg = await tgbot.edit_message(msg, '对话已取消')
                    conv.cancel()
                else:
                    msg = await tgbot.edit_message(msg, '是否尝试自动加入定时', buttons=markup)
                    # convdata2 = await conv.wait_event(press_event(SENDER))
                    # res2 = bytes.decode(convdata2.data)
                    if res == 'node':
                        backup_file(f'{SCRIPTS_DIR}/{filename}')
                        await tgbot.download_media(event.message, SCRIPTS_DIR)
                        with open(f'{SCRIPTS_DIR}/{filename}', 'r', encoding='utf-8') as f:
                            resp = f.read()
                        cmdtext = f'{ARCADIA_CMD} run {SCRIPTS_DIR}/{filename}'
                        await tgbot.edit_message(msg, '脚本已保存到scripts文件夹，并成功运行')
                        conv.cancel()
                    else:
                        backup_file(f'{res}/{filename}')
                        await tgbot.download_media(event.message, res)
                        with open(f'{res}/{filename}', 'r', encoding='utf-8') as f:
                            resp = f.read()
                        await tgbot.edit_message(msg, f'{filename}已保存到{res}文件夹')
            if cmdtext:
                await cmd(cmdtext)
    except exceptions.TimeoutError:
        msg = await tgbot.send_message(chat_id, '选择已超时，对话已停止')
    except Exception as e:
        await tgbot.send_message(chat_id, f'something wrong,I\'m sorry\n{str(e)}')
        logger.error(f'something wrong,I\'m sorry\n{str(e)}')
