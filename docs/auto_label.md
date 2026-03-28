# Dasshine Label 自动标注服务

## 概述

自动标注服务是 Dasshine Label 的核心功能之一，利用 AI 模型对数据进行预标注，**减少 70% 人工工作量**。

---

## 支持的标注类型

| 类型 | 说明 | 输入 | 输出 |
|------|------|------|------|
| **NER** | 命名实体识别 | 文本 | 实体列表（人名、地点、日期等） |
| **Classification** | 文本分类 | 文本 | 分类标签 |
| **Sentiment** | 情感分析 | 文本 | 正面/负面/中性 |
| **Summarization** | 文本摘要 | 长文本 | 摘要内容 |
| **OCR** | 文字识别 | 图片 | 识别出的文字 |

---

## 工作原理

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   任务数据   │ → │   AI 模型    │ → │   预标注结果  │
│  (文本/图片) │    │ (LLM/OCR)   │    │  + 置信度    │
└─────────────┘    └──────────────┘    └──────────────┘
                                              ↓
┌─────────────────────────────────────────────────────┐
│  置信度 ≥ 0.8    →    直接作为推荐标注              │
│  置信度 < 0.8    →    标记为需人工确认              │
└─────────────────────────────────────────────────────┘
```

---

## API 接口

### 1. 启用自动标注

```http
POST /api/v1/auto-label/enable/{project_id}
Content-Type: application/json

{
  "model": "gpt-4",
  "threshold": 0.8
}
```

### 2. 单任务自动标注

```http
POST /api/v1/auto-label/process/{task_id}
```

**响应：**
```json
{
  "success": true,
  "task_id": 1001,
  "confidence": 0.92,
  "model": "gpt-4",
  "results": [
    {
      "label": "人名",
      "text": "张三",
      "start": 12,
      "end": 14,
      "confidence": 0.95
    }
  ],
  "high_confidence": true
}
```

### 3. 批量自动标注

```http
POST /api/v1/auto-label/batch
Content-Type: application/json

{
  "project_id": 1,
  "batch_size": 100
}
```

### 4. 查看标注状态

```http
GET /api/v1/auto-label/status/{project_id}
```

**响应：**
```json
{
  "project_id": 1,
  "auto_label_enabled": true,
  "total_tasks": 5000,
  "prelabeled_tasks": 3500,
  "high_confidence": 2800,
  "low_confidence": 700,
  "high_confidence_rate": 80.0
}
```

---

## 模型配置

### 支持的 LLM

| 模型 | 优点 | 适用场景 |
|------|------|----------|
| **GPT-4** | 准确率高，通用性强 | 通用标注任务 |
| **Claude** | 上下文长，稳定 | 长文档处理 |
| **文心一言** | 中文优化，国内部署 | 中文法律/医疗 |
| **通义千问** | 成本低，API友好 | 大规模批量处理 |

### OCR 服务

| 服务 | 特点 |
|------|------|
| **PaddleOCR** | 开源，本地部署，免费 |
| **腾讯云OCR** | 中文优化，准确率高 |
| **百度OCR** | 表格识别强 |
| **阿里云OCR** | 文档结构化 |

---

## 配置示例

```python
# .env 文件

# OpenAI (用于通用文本标注)
OPENAI_API_KEY=sk-xxxxxxxx
OPENAI_MODEL=gpt-4

# 文心一言 (用于中文标注)
BAIDU_API_KEY=xxxxxxxx
BAIDU_SECRET_KEY=xxxxxxxx

# OCR服务 (可选)
TENCENT_OCR_SECRET_ID=xxxxxxxx
TENCENT_OCR_SECRET_KEY=xxxxxxxx

# 置信度阈值
AUTO_LABEL_CONFIDENCE_THRESHOLD=0.8
```

---

## 异步任务

自动标注使用 Celery 进行异步处理：

```bash
# 启动 Worker
celery -A app.celery_app worker --loglevel=info

# 启动定时任务
celery -A app.celery_app beat --loglevel=info
```

### 任务类型

| 任务 | 用途 |
|------|------|
| `auto_label_task` | 单任务自动标注 |
| `batch_auto_label` | 批量自动标注 |
| `auto_label_project` | 整个项目自动标注 |

---

## 生产环境集成

### 接入真实 LLM

修改 `app/services/auto_label.py`：

```python
class LLMClient:
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
    
    async def predict(self, prompt: str) -> str:
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )
        return response.choices[0].message.content
```

### 接入 OCR

```python
class OCRClient:
    async def recognize(self, image_url: str):
        # 使用腾讯云/百度/阿里 OCR API
        result = await tencent_ocr.recognize(image_url)
        return result
```

---

## 性能指标

| 指标 | 目标值 |
|------|--------|
| 单任务处理时间 | < 2秒 |
| 批量处理速度 | 1000条/小时 |
| 高置信度比例 | > 80% |
| 缓存命中率 | > 60% |
