import { Link } from 'react-router-dom'

function Home() {
  return (
    <div className='p-2 flex flex-col gap-2'>
      <a className='hover:cursor-pointer underline text-blue-600' href='src/pages/ui/index.html' target="_blank">题目1 -- 静态UI</a>
      <Link className='hover:cursor-pointer underline text-blue-600' to='/fetch'>题目2 -- 异步请求</Link>
      <a className='hover:cursor-pointer underline text-blue-600' href='src/pages/message/main/index.html'>题目3 -- iframe通信</a>
      <Link className='hover:cursor-pointer underline text-blue-600' to='/download'>题目4 -- 文件下载</Link>
    </div>
  )
}

export default Home