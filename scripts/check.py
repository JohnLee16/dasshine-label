#!/usr/bin/env python3
"""
Dasshine Label 项目完整性检查脚本
"""

import os
import sys
import ast


def check_python_syntax(filepath):
    """检查Python文件语法"""
    try:
        with open(filepath, 'r') as f:
            ast.parse(f.read())
        return True, None
    except SyntaxError as e:
        return False, str(e)


def check_project():
    """检查项目完整性"""
    print("🔍 Dasshine Label 项目完整性检查")
    print("=" * 50)
    
    errors = []
    warnings = []
    
    # 检查必要文件
    required_files = [
        'backend/app/main.py',
        'backend/app/models/user.py',
        'backend/app/models/project.py',
        'backend/app/models/task.py',
        'backend/app/services/task_dispatch.py',
        'backend/app/services/auto_label.py',
        'backend/app/services/quality_control.py',
        'backend/app/api/v1/auth.py',
        'backend/app/api/v1/tasks.py',
        'backend/app/api/v1/projects.py',
        'backend/app/api/v1/export.py',
        'backend/app/api/v1/users.py',
        'backend/app/api/v1/annotations.py',
        'backend/app/api/v1/auto_label.py',
        'backend/app/api/v1/quality.py',
        'backend/requirements.txt',
        'backend/Dockerfile',
        'frontend/src/main.tsx',
        'frontend/src/App.tsx',
        'frontend/package.json',
        'frontend/vite.config.ts',
        'deploy/docker-compose.yml',
        '.gitignore',
    ]
    
    print("\n📁 检查必要文件...")
    for filepath in required_files:
        full_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), filepath)
        if os.path.exists(full_path):
            print(f"  ✅ {filepath}")
        else:
            print(f"  ❌ {filepath} - 缺失")
            errors.append(f"缺失文件: {filepath}")
    
    # 检查Python语法
    print("\n🐍 检查Python文件语法...")
    backend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'backend')
    for root, dirs, files in os.walk(backend_dir):
        # 跳过虚拟环境目录
        dirs[:] = [d for d in dirs if d not in ['venv', '__pycache__', '.pytest_cache']]
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                valid, error = check_python_syntax(filepath)
                rel_path = os.path.relpath(filepath, backend_dir)
                if valid:
                    pass  # 太多文件，不打印成功信息
                else:
                    print(f"  ❌ {rel_path} - {error}")
                    errors.append(f"语法错误 {rel_path}: {error}")
    
    if not any('语法错误' in e for e in errors):
        print("  ✅ 所有Python文件语法正确")
    
    # 统计代码行数
    print("\n📊 代码统计...")
    total_lines = 0
    for root, dirs, files in os.walk(backend_dir):
        dirs[:] = [d for d in dirs if d not in ['venv', '__pycache__', '.pytest_cache']]
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    total_lines += len(f.readlines())
    print(f"  Python代码: ~{total_lines} 行")
    
    frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'src')
    if os.path.exists(frontend_dir):
        ts_lines = 0
        for root, dirs, files in os.walk(frontend_dir):
            dirs[:] = [d for d in dirs if d not in ['node_modules', 'dist']]
            for file in files:
                if file.endswith(('.ts', '.tsx')):
                    filepath = os.path.join(root, file)
                    with open(filepath, 'r') as f:
                        ts_lines += len(f.readlines())
        print(f"  TypeScript代码: ~{ts_lines} 行")
    
    # 总结
    print("\n" + "=" * 50)
    if errors:
        print(f"❌ 发现 {len(errors)} 个问题:")
        for error in errors:
            print(f"   - {error}")
        return False
    else:
        print("✅ 项目检查通过！")
        print("\n🚀 启动命令:")
        print("   cd deploy && docker-compose up -d")
        print("   cd backend && uvicorn app.main:app --reload")
        print("   cd frontend && npm run dev")
        return True


if __name__ == "__main__":
    success = check_project()
    sys.exit(0 if success else 1)
