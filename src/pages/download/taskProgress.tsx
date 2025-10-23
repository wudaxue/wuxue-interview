export type Task = {
  id: number
  urls: string[]
  type: 'single' | 'batch'
  progress: number
  total: number
  completed: number
  status: 'queued' | 'running' | 'done' | 'error'
  failedUrls?: string[]
}

export const TaskProgress = ({
  task,
}: {
  task: Task
}) => (
  <div className='rounded border bg-gray-50 p-3 text-sm'>
    <div className='flex justify-between'>
      <span>任务 {task.id} ({task.type})</span>
      <span>{task.status}</span>
    </div>
    <div className='mt-2 h-2 overflow-hidden rounded bg-gray-200'>
      <div className='h-2 bg-blue-500' style={{ width: `${task.progress}%` }} />
    </div>
    <div className='mt-1 text-gray-500 text-xs'>{task.completed}/{task.total}</div>
    {(Array.isArray(task.failedUrls) && task.failedUrls.length > 0) && (
      <div className='mt-2 rounded border border-red-300 bg-red-100 p-2 text-red-700 text-xs'>
        <strong>下载失败文件:</strong>
        <ul className='list-inside list-disc'>
          {task.failedUrls.map(url => <li key={url}>{url}</li>)}
        </ul>
      </div>
    )}
  </div>
)