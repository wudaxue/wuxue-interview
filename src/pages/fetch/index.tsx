import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function fetchDemo() {
  const [promiseResults, setPromiseResults] = useState<string[]>([])
  const [queueResults, setQueueResults] = useState<string[]>([])

  // --- Promise 版本 ---
  let sequence = Promise.resolve() 
  const promiseResultsRef = React.useRef<string[]>([])

  function fetchData(id: number) {
    return new Promise<string>((resolve) => {
      const delay = Math.random() * 2000
      setTimeout(() => resolve(`数据-${id}（延迟 ${delay.toFixed(0)}ms）`), delay)
    })
  }

  function handlePromiseClick(id: number) {
    const p = fetchData(id)
    sequence = sequence
      .then(() => p)
      .then((data) => {
        promiseResultsRef.current.push(data)
        console.log('✅ Promise顺序更新 UI:', data)
        setPromiseResults([...promiseResultsRef.current])
      })
      .catch(console.error)
  }

  // --- 非 Promise 版本 ---
  const queueRef = React.useRef<{ id: number; done: boolean; data: string | null }[]>([])
  const processingRef = React.useRef(false)
  const queueResultsRef = React.useRef<string[]>([])

  function handleQueueClick(id: number) {
    const task = { id, done: false, data: null as string | null }
    queueRef.current.push(task)

    const delay = Math.random() * 2000
    setTimeout(() => {
      task.done = true
      task.data = `数据-${id}（延迟 ${delay.toFixed(0)}ms）`
      processQueue()
    }, delay)
  }

  function processQueue() {
    if (processingRef.current) return
    processingRef.current = true

    ;(function next() {
      const first = queueRef.current[0]
      if (!first || !first.done) {
        processingRef.current = false
        return
      }

      queueResultsRef.current.push(first.data!)
      console.log('✅ 队列顺序更新 UI:', first.data)
      setQueueResults([...queueResultsRef.current])
      queueRef.current.shift()

      next()
    })()
  }

  return (
    <div className='mx-auto max-w-2xl space-y-6 p-6'>
      <h1 className='mb-6 text-center font-bold text-2xl'>顺序请求测试（Promise vs Queue）</h1>

      {/* Promise 版本 */}
      <section className='rounded-xl border p-4 shadow-sm'>
        <h2 className='mb-2 font-semibold text-lg'>Promise 链式方案</h2>
        <div className='mb-4 space-x-2'>
          {[1, 2, 3, 4].map((id) => (
            <Button
              key={id}
              onClick={() => handlePromiseClick(id)}
              className='rounded bg-blue-500 px-3 py-1.5 text-white transition hover:bg-blue-600'
            >
              请求 {id}
            </Button>
          ))}
        </div>
        <div className='rounded bg-gray-50 p-2 text-sm'>
          <p className='font-medium'>结果：</p>
          {promiseResults.length > 0 ? (
            <ul className='list-inside list-disc'>
              {promiseResults.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className='text-gray-400'>暂无数据</p>
          )}
        </div>
      </section>

      {/* 队列版本 */}
      <section className='rounded-xl border p-4 shadow-sm'>
        <h2 className='mb-2 font-semibold text-lg'>非 Promise 队列方案</h2>
        <div className='mb-4 space-x-2'>
          {[1, 2, 3, 4].map((id) => (
            <Button
              key={id}
              onClick={() => handleQueueClick(id)}
              className='rounded bg-green-500 px-3 py-1.5 text-white transition hover:bg-green-600'
            >
              请求 {id}
            </Button>
          ))}
        </div>
        <div className='rounded bg-gray-50 p-2 text-sm'>
          <p className='font-medium'>结果：</p>
          {queueResults.length > 0 ? (
            <ul className='list-inside list-disc'>
              {queueResults.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          ) : (
            <p className='text-gray-400'>暂无数据</p>
          )}
        </div>
      </section>
    </div>
  )
}
