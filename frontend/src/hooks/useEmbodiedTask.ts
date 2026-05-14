import { useCallback, useEffect, useState } from 'react'
import { embodiedTaskApi } from '../services/api'
import type {
  EmbodiedAnnotationDocument,
  EmbodiedAnnotationEnvelope,
  EmbodiedEpisodeManifest,
} from '../types/embodied'
import { emptyEmbodiedAnnotation } from '../types/embodied'

export function useEmbodiedTask(taskId: number | undefined) {
  const [manifest, setManifest] = useState<EmbodiedEpisodeManifest | null>(null)
  const [annotation, setAnnotation] = useState<EmbodiedAnnotationDocument>(() => emptyEmbodiedAnnotation())
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (taskId == null || Number.isNaN(taskId)) {
      setLoading(false)
      setError('无效的任务 ID')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [mRes, aRes] = await Promise.all([
        embodiedTaskApi.getManifest(taskId),
        embodiedTaskApi.getAnnotation(taskId),
      ])
      setManifest(mRes.data)
      const env = aRes.data as EmbodiedAnnotationEnvelope
      setAnnotation(env.annotation ?? emptyEmbodiedAnnotation())
      setSavedAt(env.updated_at ?? null)
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : ''
      setError(msg || '加载失败，请检查登录与任务权限')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => {
    void load()
  }, [load])

  const save = useCallback(async () => {
    if (taskId == null || Number.isNaN(taskId)) return
    setSaving(true)
    setError(null)
    try {
      const res = await embodiedTaskApi.putAnnotation(taskId, annotation)
      setSavedAt(res.data.updated_at)
    } catch (e: unknown) {
      const msg =
        typeof e === 'object' && e !== null && 'response' in e
          ? String((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? '')
          : ''
      setError(msg || '保存失败')
    } finally {
      setSaving(false)
    }
  }, [taskId, annotation])

  return {
    manifest,
    annotation,
    setAnnotation,
    savedAt,
    loading,
    saving,
    error,
    setError,
    reload: load,
    save,
  }
}
