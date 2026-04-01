// AnnotationWorkspace — 通用标注入口，根据任务类型跳转到对应标注页
import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function AnnotationWorkspace() {
  const { taskId } = useParams<{ taskId: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    // 实际项目中从 API 获取任务类型后决定跳转
    // 这里默认跳到 2D 图像标注
    navigate(`/annotate-image/${taskId}`, { replace: true })
  }, [taskId])

  return (
    <div className="h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-white/30 text-sm animate-pulse">正在加载标注工作台…</div>
    </div>
  )
}
