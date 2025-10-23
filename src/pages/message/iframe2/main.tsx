import { createRoot } from 'react-dom/client'
import '@/index.css'
import { StrictMode } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import { IframeCommSDK } from '../utils/frame-sdk'

const sdk = new IframeCommSDK({
  id: 'iframe2',
  domain: window.location.origin,
})

sdk.onMessage(async (payload, sendResponse, rawMsg) => {
  await new Promise((r) => setTimeout(r, 300))
  console.log('[iframe2] 收到消息:', payload)
  console.log('[iframe2] 消息详情:', {
    messageId: rawMsg.messageId,
    sourceId: rawMsg.sourceId,
    targetId: rawMsg.targetId,
    relayId: rawMsg.relayId,
    type: rawMsg.type
  })
  sendResponse({ done: true, at: Date.now() })
})

function sendToFrame(id: string) {
  sdk.send(id, { action: 'hello', data: `hi ${id}` }, (res) => {
    toast(`${id} 已成功执行命令：${res.action}, 从${res.relayId}中转`)
    console.log(`${id} 已成功执行命令：${res.action}, 从${res.relayId}中转`)
  })
}


function Iframe2App() {
  const targetList = sdk.getAvailableTargets()
  console.log(targetList, 'targetList')
  return (
    <div className='h-full bg-blue-300 p-4'>
      <h1 className='mb-4 font-bold text-2xl text-green-600'>Iframe 2</h1>
      <Button onClick={() => sendToFrame('iframe3')}>Send Message</Button>
      <Toaster />
    </div>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Iframe2App />
  </StrictMode>,
)
