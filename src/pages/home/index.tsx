import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className='flex flex-col gap-2 p-2'>
      <a
        className='text-blue-600 underline hover:cursor-pointer'
        href='src/pages/ui/index.html'
        target='_blank'
        rel='noopener'
      >
        题目1 -- 静态UI
      </a>
      <Link className='text-blue-600 underline hover:cursor-pointer' to='/fetch'>
        题目2 -- 异步请求
      </Link>
      <a
        className='text-blue-600 underline hover:cursor-pointer'
        href='src/pages/message/main/index.html'
      >
        题目3 -- iframe通信
      </a>
      <Link className='text-blue-600 underline hover:cursor-pointer' to='/download'>
        题目4 -- 文件下载
      </Link>
    </div>
  )
}

export default Home
