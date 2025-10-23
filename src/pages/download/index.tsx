import JSZip from 'jszip'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { imageList } from './const'
import { type Task, TaskProgress } from './taskProgress'

export default function DownloadManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [inputUrls, setInputUrls] = useState(imageList.join(','))
  const abortControllers = useRef<Record<string, AbortController>>({})
  const maxConcurrentDownloads = 5

  // 统一更新任务状态
  const updateTask = useCallback((id: number, updater: (task: Task) => Partial<Task>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updater(t) } : t)))
  }, [])

  // 下载单个文件
  const downloadFile = useCallback(async (url: string) => {
    // 绕过跨域限制
    const proxyUrl = url.replace('https://gansu.gscn.com.cn', '/api-img')
    const controller = new AbortController()
    abortControllers.current[url] = controller
    console.log(proxyUrl, 'proxyUrl')
    const res = await fetch(proxyUrl, { signal: controller.signal })
    if (!res.ok) throw new Error(`下载失败: ${url}`)
    const blob = await res.blob()
    return { blob, name: url.split('/').pop() || 'file' }
  }, [])

  // 批量下载
  const handleBatchDownload = useCallback(
    async (task: Task) => {
      const zip = new JSZip()
      const failedUrls: string[] = []
      let completed = 0

      // 切分为并发块
      const chunks: string[][] = []
      for (let i = 0; i < task.urls.length; i += maxConcurrentDownloads) {
        chunks.push(task.urls.slice(i, i + maxConcurrentDownloads))
      }

      for (const chunk of chunks) {
        await Promise.allSettled(
          chunk.map((url) =>
            downloadFile(url)
              .then(({ blob, name }) => {
                zip.file(name, blob)
                completed++
                updateTask(task.id, (t) => ({
                  completed,
                  progress: Math.round((completed / t.total) * 100),
                }))
              })
              .catch(() => failedUrls.push(url)),
          ),
        )
      }

      if (failedUrls.length > 0) {
        updateTask(task.id, () => ({ failedUrls }))
        console.warn(`有 ${failedUrls.length} 个文件下载失败，跳过打包。`)
        return false
      }

      const content = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(content)
      link.download = `batch_${task.id}.zip`
      link.click()
      return true
    },
    [downloadFile, updateTask],
  )

  // 启动任务
  const startNextTask = useCallback(
    async (task: Task) => {
      updateTask(task.id, () => ({ status: 'running', failedUrls: [] }))
      try {
        if (task.type === 'single') {
          const { blob, name } = await downloadFile(task.urls[0])
          const link = document.createElement('a')
          link.href = URL.createObjectURL(blob)
          link.download = name
          link.click()
          updateTask(task.id, () => ({ completed: 1, progress: 100, status: 'done' }))
        } else {
          const success = await handleBatchDownload(task)
          if (success) {
            updateTask(task.id, (t) => ({ status: 'done', progress: 100, completed: t.total }))
          } else {
            updateTask(task.id, () => ({ status: 'error' }))
          }
        }
      } catch {
        updateTask(task.id, () => ({ status: 'error' }))
      }
    },
    [downloadFile, handleBatchDownload, updateTask],
  )

  // 自动触发队列
  useEffect(() => {
    const nextTask = tasks.find((t) => t.status === 'queued')
    if (nextTask) startNextTask(nextTask)
  }, [tasks, startNextTask])

  // 添加任务
  const addTask = useCallback(
    (type: 'single' | 'batch') => {
      const urls = inputUrls
        .split(/[\n,，]/)
        .map((u) => u.trim())
        .filter(Boolean)
      if (!urls.length) return

      const id = Date.now()
      setTasks((prev) => [
        ...prev,
        {
          id,
          urls,
          type,
          progress: 0,
          total: urls.length,
          completed: 0,
          status: 'queued',
        },
      ])
      setInputUrls('')
    },
    [inputUrls],
  )

  return (
    <div className='mx-auto max-w-xl space-y-4 p-6'>
      <h2 className='font-bold text-lg'>下载管理器</h2>

      <textarea
        className='h-[300px] w-full rounded border p-2 text-sm'
        placeholder='输入文件链接，每行一个或使用逗号隔开'
        value={inputUrls}
        onChange={(e) => setInputUrls(e.target.value)}
      />

      <div className='flex space-x-2'>
        <Button
          onClick={() => addTask('single')}
          className='rounded bg-blue-500 px-4 py-2 text-white'
        >
          添加单个任务
        </Button>
        <Button
          onClick={() => addTask('batch')}
          className='rounded bg-green-500 px-4 py-2 text-white'
        >
          添加批量任务
        </Button>
      </div>

      <div className='mt-4 space-y-3'>
        {tasks.map((task) => (
          <TaskProgress key={task.id} task={task} />
        ))}
      </div>
    </div>
  )
}
