# Dasshine Label - 智能标注与分发平台

<div align="center">

![Dasshine Label](https://img.shields.io/badge/Dasshine-Label-00d4ff?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white)

**自动标注 + 智能任务分发 + 多层质量控制**

</div>

## 🌟 核心特性

- 🤖 **AI 自动预标注** - 集成 LLM/OCR，减少 70% 人工工作量
- 🎯 **智能任务分发** - 多维度评分算法，精准匹配标注员
- ✨ **科技感界面** - 深色主题，发光效果，专业标注体验
- 🔒 **三层质检** - 自动规则 → 交叉验证 → 专家审核
- 📊 **实时监控** - 进度追踪，质量统计，收益管理

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────────────┐ │
│  │  登录页面   │ │  工作台     │ │      标注界面             │ │
│  └────────────┘ └────────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     Backend (FastAPI)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │   Auth   │ │  Tasks   │ │ Projects │ │  Auto Label    │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐  │
│  │ Dispatch │ │ Quality  │ │  Export  │ │    Review      │  │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL      Redis      Celery               │
└─────────────────────────────────────────────────────────────┘
```

## 📦 项目结构

```
dasshine-label/
├── backend/              # FastAPI 后端
│   ├── app/
│   │   ├── api/v1/       # API 路由
│   │   │   ├── auth.py              # 认证
│   │   │   ├── tasks.py             # 任务管理
│   │   │   ├── auto_label.py        # 自动标注
│   │   │   └── quality.py           # 质量控制 ✅
│   │   ├── models/       # 数据库模型
│   │   ├── services/     # 业务逻辑
│   │   │   ├── task_dispatch.py     # 任务分发算法
│   │   │   ├── auto_label.py        # 自动标注服务
│   │   │   └── quality_control.py   # 质量控制 ✅
│   │   └── tasks/        # Celery 异步任务
│   └── requirements.txt
├── frontend/             # React 前端
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   └── components/
│   └── package.json
├── deploy/
│   └── docker-compose.yml
└── docs/                 # 文档
    ├── task_dispatch.md
    ├── auto_label.md
    ├── quality_control.md  ✅
    └── frontend.md
```

## 🚀 快速开始

### 1. Docker 一键启动

```bash
cd deploy
docker-compose up -d
```

访问：
- 前端: http://localhost:3000
- 后端 API: http://localhost:8000
- API 文档: http://localhost:8000/docs

### 2. 手动启动

**后端：**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload
```

**前端：**
```bash
cd frontend
npm install
npm run dev
```

**Celery Worker：**
```bash
cd backend
celery -A app.celery_app worker --loglevel=info
```

## 📖 核心功能详解

### 1. 自动标注服务

```python
POST /api/v1/auto-label/enable/1
{
  "model": "gpt-4",
  "threshold": 0.8
}

POST /api/v1/auto-label/batch
{
  "project_id": 1,
  "batch_size": 100
}
```

### 2. 智能任务分发

```
总分 = 技能匹配×0.35 + 历史质量×0.25 + 负载均衡×0.20 
     + 响应速度×0.10 + 等级加成×0.10
```

### 3. 质量控制体系

```
┌─────────────┐
│  自动规则   │ → 格式校验、必填检查
├─────────────┤
│  交叉验证   │ → Kappa系数、一致率
├─────────────┤
│  黄金标准   │ → 10%测试题监控质量
├─────────────┤
│  专家审核   │ → 抽样审核、争议仲裁
└─────────────┘
```

**API：**
```python
# 计算交叉验证
POST /api/v1/quality/cross-validation
{ "task_id": 1001 }

# 获取质量评分
GET /api/v1/quality/score/{user_id}

# 审核任务
POST /api/v1/quality/review
{
  "task_id": 1001,
  "decision": "approved",
  "score": 95
}
```

## 🔧 配置说明

```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/dasshine_label

# Redis
REDIS_URL=redis://localhost:6379/0

# 自动标注
OPENAI_API_KEY=sk-xxx
AUTO_LABEL_CONFIDENCE_THRESHOLD=0.8

# 质量控制
QUALITY_MIN_AGREEMENT=0.8
QUALITY_GOLDEN_RATIO=0.1
```

## 📚 文档

- [任务分发算法](docs/task_dispatch.md)
- [自动标注服务](docs/auto_label.md)
- [质量控制体系](docs/quality_control.md) ✅ 新增
- [前端界面说明](docs/frontend.md)

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT License

---

<div align="center">
Made with ❤️ by Dasshine Team
</div>
