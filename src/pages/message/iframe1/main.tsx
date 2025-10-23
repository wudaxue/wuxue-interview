import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

import { IframeCommSDK } from '../utils/frame-sdk'

const iframe1 = new IframeCommSDK({
  id: 'iframe1',
  domain: window.location.origin,
})

iframe1.onMessage(async (payload, sendResponse, rawMsg) => {
  await new Promise((r) => setTimeout(r, 300))
  console.log('iframe1 收到来自主页面的消息：', payload.data)
  console.log('[iframe1] 消息详情:', {
    messageId: rawMsg.messageId,
    sourceId: rawMsg.sourceId,
    targetId: rawMsg.targetId,
    relayId: rawMsg.relayId,
    type: rawMsg.type
  })
  toast(`iframe1 收到来自主页面的消息：${payload.data}`)
  sendResponse({ done: true, at: Date.now(), action: payload.action })
})

function sendToFrame(id: string) {
  iframe1.send(id, { action: 'hello', data: `hi ${id}` }, (res) => {
    console.log(`iframe1 收到 ${id} 响应:`, res)
    toast(`iframe1 收到 ${id} 响应: ${JSON.stringify(res)}`)
  })
}

function Iframe1App() {
  return (
    <div className='h-full bg-amber-300 p-4'>
      <h1 className='mb-4 font-bold text-2xl text-green-600'>Iframe 1</h1>
      {/* <Button onClick={() => sendToFrame('iframe2')}>Send Message</Button> */}
      <Toaster />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Iframe1App />
  </StrictMode>,
)
