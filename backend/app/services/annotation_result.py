"""
与 ORM Annotation.data 对齐的读取工具（提交结果存放在 data['result'] 或整包 data）。
"""

from __future__ import annotations

from typing import Any, Dict

from app.models.annotation import Annotation


def get_annotation_result_dict(ann: Annotation) -> Dict[str, Any]:
    raw = ann.data
    if raw is None:
        return {}
    if isinstance(raw, dict) and isinstance(raw.get("result"), dict):
        return raw["result"]
    if isinstance(raw, dict):
        return raw
    return {}
