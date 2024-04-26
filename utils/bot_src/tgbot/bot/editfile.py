from telethon import events, Button
import os
import shutil
from asyncio import exceptions
from .. import tgbot, chat_id, ARCADIA_DIR, BOT_SET, ch_name
from .utils import split_list, logger, press_event


@tgbot.on(events.NewMessage(from_users=chat_id, pattern='/edit'))
async def my_edit(event):
    '''定义编辑文件操作'''
    logger.info(f'即将执行{event.raw_text}命令')
    msg_text = event.raw_text.split(' ')
    SENDER = event.sender_id
    path = ARCADIA_DIR
    page = 0
    if isinstance(msg_text,list) and len(msg_text) == 2:
        text = msg_text[-1]
    else:
        text = None
    logger.info(f'命令参数值为：{text}')
    if text and os.path.isfile(text):
        try:
            with open(text, 'r', encoding='utf-8') as f:
                lines = f.readlines()
                filelist = split_list(lines, 15)
                path = text
        except Exception as e:
            await tgbot.send_message(chat_id, f'something wrong,I\'m sorry\n{str(e)}')
    elif text and os.path.isdir(text):
        path = text
        filelist = None
    elif text:
        await tgbot.send_message(chat_id, 'please marksure it\'s a dir or a file')
        filelist = None
    else:
        filelist = None
    async with tgbot.conversation(SENDER, timeout=120) as conv:
        msg = await conv.send_message('🕙 正在查询，请稍后...')
        while path:
            path, msg, page, filelist = await edit_file(conv, SENDER, path, msg, page, filelist)


if ch_name:
    tgbot.add_event_handler(my_edit, events.NewMessage(
        from_users=chat_id, pattern=BOT_SET['命令别名']['edit']))


async def edit_file(conv, SENDER, path, msg, page, filelist):
    mybtn = [Button.inline('上一页', data='up'), Button.inline('下一页', data='next'), Button.inline(
        '上级', data='updir'), Button.inline('取消', data='cancel')]
    mybtn2 = [[Button.inline('上一页', data='up'), Button.inline(
        '下一页', data='next'), Button.inline('取消', data='cancel')], [Button.inline('上十页', data='up10'), Button.inline(
            '下十页', data='next10'), Button.inline('编辑', data='edit')]]
    try:
        if filelist and type(filelist[0][0]) == str:
            markup = filelist
            newmarkup = markup[page]
            msg = await tgbot.edit_message(msg, "".join(newmarkup), buttons=mybtn2)
        else:
            if filelist:
                markup = filelist
                newmarkup = markup[page]
                if mybtn not in newmarkup:
                    newmarkup.append(mybtn)
            else:
                dir = os.listdir(path)
                dir.sort()
                markup = [Button.inline(file, data=str(
                    file)) for file in dir]
                markup = split_list(markup, int(BOT_SET['每页列数']))
                if len(markup) > 30:
                    markup = split_list(markup, 30)
                    newmarkup = markup[page]
                    newmarkup.append(mybtn)
                else:
                    newmarkup = markup
                    if path == ARCADIA_DIR:
                        newmarkup.append([Button.inline('取消', data='cancel')])
                    else:
                        newmarkup.append(
                            [Button.inline('上级', data='updir'), Button.inline('取消', data='cancel')])
            msg = await tgbot.edit_message(msg, '请做出您的选择：', buttons=newmarkup)
        convdata = await conv.wait_event(press_event(SENDER))
        res = bytes.decode(convdata.data)
        if res == 'cancel':
            msg = await tgbot.edit_message(msg, '对话已取消')
            conv.cancel()
            return None, None, None, None
        elif res == 'next':
            page = page + 1
            if page > len(markup) - 1:
                page = 0
            return path, msg, page,  markup
        elif res == 'up':
            page = page - 1
            if page < 0:
                page = len(markup) - 1
            return path, msg, page,  markup
        elif res == 'next10':
            page = page + 10
            if page > len(markup) - 1:
                page = 0
            return path, msg, page,  markup
        elif res == 'up10':
            page = page - 10
            if page < 0:
                page = len(markup) - 1
            return path, msg, page,  markup
        elif res == 'updir':
            path = '/'.join(path.split('/')[:-1])
            if path == '':
                path = ARCADIA_DIR
            return path, msg, page,  None
        elif res == 'edit':
            await tgbot.send_message(chat_id, '请复制并修改以下内容，修改完成后发回机器人，2分钟内有效\n发送`cancel`或`取消`取消对话')
            await tgbot.delete_messages(chat_id, msg)
            msg = await conv.send_message(f'`{"".join(newmarkup)}`')
            resp = await conv.get_response()
            if resp.raw_text == 'cancel' or resp.raw_text == '取消':
                await tgbot.delete_messages(chat_id,msg)
                await tgbot.send_message(chat_id, '对话已取消')
                conv.cancel()
                return
            markup[page] = resp.raw_text.split('\n')
            for a in range(len(markup[page])):
                markup[page][a] = markup[page][a]+'\n'
            shutil.copy(path, f'{path}.bak')
            with open(path, 'w+', encoding='utf-8') as f:
                markup = ["".join(a) for a in markup]
                f.writelines(markup)
            await tgbot.send_message(chat_id, f'文件已修改成功，原文件备份为{path}.bak')
            conv.cancel()
            return None, None, None, None
        elif os.path.isfile(f'{path}/{res}'):
            msg = await tgbot.edit_message(msg, '文件读取中...请稍候')
            with open(f'{path}/{res}', 'r', encoding='utf-8') as f:
                lines = f.readlines()
            lines = split_list(lines, 15)
            page = 0
            return f'{path}/{res}', msg, page, lines
        else:
            return f'{path}/{res}', msg, page, None
    except exceptions.TimeoutError:
        msg = await tgbot.edit_message(msg, '选择已超时，本次对话已停止')
        return None, None, None, None
    except Exception as e:
        msg = await tgbot.edit_message(msg, f'something wrong,I\'m sorry\n{str(e)}')
        logger.error(f'something wrong,I\'m sorry\n{str(e)}')
        return None, None, None, None
