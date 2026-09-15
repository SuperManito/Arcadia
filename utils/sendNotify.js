async function sendNotify(text, desp) {
  try {
    const response = await fetch('http://127.0.0.1:5678/api/inner/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: text, content: desp, type: 'info' }),
      signal: AbortSignal.timeout(5000),
    })
    const result = await response.json()
    if (result.code === 1) {
      console.log('已将消息推送至 Arcadia')
    }
    else {
      console.error(`Arcadia 推送通知失败：${result.message || '未知错误'}`)
    }
  }
  catch (err) {
    console.error(`Arcadia 推送通知失败：${err.message || err}`)
  }
}

module.exports = {
  sendNotify,
}
