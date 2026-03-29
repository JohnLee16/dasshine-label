#!/bin/bash
# Dasshine Label 快速启动脚本

set -e

echo "🚀 Dasshine Label 初始化脚本"
echo "=============================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker未安装，请先安装Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose未安装，请先安装Docker Compose${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker环境检查通过${NC}"

# 进入项目目录
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)

echo "📁 项目目录: $PROJECT_ROOT"

# 启动基础设施
echo ""
echo "📦 启动PostgreSQL和Redis..."
cd deploy

# 检查容器是否已在运行
if docker ps | grep -q "dasshine-db"; then
    echo -e "${YELLOW}⚠ PostgreSQL 已在运行${NC}"
else
    docker-compose up -d db redis
    echo -e "${GREEN}✓ 数据库已启动${NC}"
fi

# 等待数据库启动
echo "⏳ 等待数据库就绪..."
sleep 5

# 检查数据库连接
if docker exec dasshine-db pg_isready -U dasshine > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据库连接正常${NC}"
else
    echo -e "${YELLOW}⚠ 等待数据库启动中...${NC}"
    sleep 5
fi

cd ..

# 安装后端依赖
echo ""
echo "🐍 检查Python依赖..."
if python3 -c "import fastapi" 2>/dev/null; then
    echo -e "${GREEN}✓ Python依赖已安装${NC}"
else
    echo "📦 安装Python依赖..."
    cd backend
    pip3 install -r requirements.txt
    cd ..
    echo -e "${GREEN}✓ Python依赖安装完成${NC}"
fi

# 运行数据库迁移
echo ""
echo "🗄️ 运行数据库迁移..."
cd backend

# 检查是否需要初始化
if python3 -c "
import sys
sys.path.insert(0, '.')
from app.db.session import engine
from app.models.base import Base
try:
    Base.metadata.create_all(bind=engine)
    print('OK')
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
" 2>/dev/null | grep -q "OK"; then
    echo -e "${GREEN}✓ 数据库表结构已就绪${NC}"
else
    echo -e "${YELLOW}⚠ 数据库迁移可能存在问题，请手动检查${NC}"
fi

cd ..

# 安装前端依赖
echo ""
echo "📦 检查前端依赖..."
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✓ 前端依赖已安装${NC}"
else
    echo "📦 安装前端依赖..."
    cd frontend
    npm install
    cd ..
    echo -e "${GREEN}✓ 前端依赖安装完成${NC}"
fi

# 创建环境配置文件
echo ""
echo "🔧 检查环境配置..."
if [ -f "backend/.env" ]; then
    echo -e "${GREEN}✓ 后端环境配置已存在${NC}"
else
    echo "📝 创建后端环境配置文件..."
    cat > backend/.env << 'EOF'
# Dasshine Label 环境配置
APP_NAME=Dasshine Label
DEBUG=true
SECRET_KEY=your-secret-key-change-in-production

# 数据库配置
DATABASE_URL=postgresql://dasshine:dasshine123@localhost:5432/dasshine_label

# Redis配置
REDIS_URL=redis://localhost:6379/0

# 自动标注配置
AUTO_LABEL_ENABLED=true
AUTO_LABEL_CONFIDENCE_THRESHOLD=0.8
EOF
    echo -e "${GREEN}✓ 后端环境配置已创建${NC}"
fi

echo ""
echo "=============================="
echo -e "${GREEN}✅ 初始化完成！${NC}"
echo ""
echo "📋 启动命令:"
echo ""
echo "  1️⃣  启动后端服务:"
echo "      cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
echo ""
echo "  2️⃣  启动前端服务:"
echo "      cd frontend && npm run dev"
echo ""
echo "  3️⃣  启动Celery Worker (可选，用于自动标注):"
echo "      cd backend && celery -A app.celery_app worker --loglevel=info"
echo ""
echo "🌐 访问地址:"
echo "   前端界面: http://localhost:3000"
echo "   API文档:  http://localhost:8000/docs"
echo ""
echo "🔑 默认测试账号:"
echo "   用户名: admin"
echo "   密码: admin123"
echo ""
echo "=============================="
