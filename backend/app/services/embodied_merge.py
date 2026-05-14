"""
提交时把任务 metadata 中的具身草稿并入最终 result，便于导出与训练一条 JSON。
"""

from __future__ import annotations

import copy
from typing import Any, Dict

from app.models.task import Task


def merge_embodied_draft_into_result(task: Task, result: Dict[str, Any]) -> Dict[str, Any]:
    """
    若 task.task_metadata['embodied']['annotation'] 存在，则写入 result['embodied']，
    并附带 manifest 快照（来自 task.data）与草稿时间戳。

    策略：metadata 中的具身草稿优先覆盖 result['embodied']['annotation']（与 Episode 自动保存一致）。
    """
    out: Dict[str, Any] = copy.deepcopy(result) if isinstance(result, dict) else {}

    meta = task.task_metadata
    if not isinstance(meta, dict):
        return out

    embodied_meta = meta.get("embodied")
    if not isinstance(embodied_meta, dict):
        return out

    draft = embodied_meta.get("annotation")
    if draft is None:
        return out

    embodied_block: Dict[str, Any] = dict(out.get("embodied") or {})
    embodied_block["annotation"] = draft
    embodied_block["draft_saved_at"] = embodied_meta.get("updated_at")
    embodied_block["draft_schema_version"] = embodied_meta.get("schema_version")

    data = task.data
    if isinstance(data, dict):
        emb_data = data.get("embodied")
        if isinstance(emb_data, dict) and emb_data.get("manifest") is not None:
            embodied_block["manifest"] = emb_data["manifest"]

    out["embodied"] = embodied_block
    return out
