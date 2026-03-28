# Dasshine Label 前端

## 技术栈

- **框架**: React 18 + TypeScript
- **构建**: Vite 5
- **状态管理**: Zustand
- **UI组件**: Ant Design 5
- **请求**: Axios + React Query
- **路由**: React Router 6

## 目录结构

```
frontend/
├── src/
│   ├── api/               # API请求
│   ├── components/        # 组件
│   │   ├── annotation/   # 标注相关
│   │   ├── project/      # 项目相关
│   │   ├── task/         # 任务相关
│   │   └── common/       # 通用组件
│   ├── pages/            # 页面
│   ├── stores/           # 状态管理
│   ├── hooks/            # 自定义Hooks
│   ├── utils/            # 工具函数
│   ├── types/            # TypeScript类型
│   └── App.tsx           # 入口
├── public/
└── package.json
```

## 快速开始

```bash
npm install
npm run dev
```
