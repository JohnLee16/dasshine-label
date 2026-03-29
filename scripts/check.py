#!/usr/bin/env python3
"""
Dasshine Label 项目完整性检查脚本
"""

import os
import sys
from pathlib import Path

def check_file_exists(filepath, description):
    """检查文件是否存在"""
    if os.path.exists(filepath):
        print(f"✅ {description}: {filepath}")
        return True
    else:
        print(f"❌ 缺失 {description}: {filepath}")
        return False

def check_python_syntax(filepath):
    """检查Python语法"""
    try:
        import py_compile
        py_compile.compile(filepath, doraise=True)
        return True
    except Exception as e:
        print(f"   ❌ 语法错误: {e}")
        return False

def main():
    base_path = Path(__file__).parent.parent
    os.chdir(base_path)
    
    print("="*60)
    print("Dasshine Label 项目完整性检查")
    print("="*60)
    
    errors = []
    
    # 1. 检查核心配置文件
    print("\n📋 检查核心配置...")
    core_files = [
        ("app/core/config.py", "配置模块"),
        ("app/core/security.py", "安全模块"),
        ("app/core/database.py", "数据库模块"),
        ("app/core/exceptions.py", "异常模块"),
    ]
    for file, desc in core_files:
        if not check_file_exists(file, desc):
            errors.append(f"缺失核心文件: {file}")
        elif not check_python_syntax(file):
            errors.append(f"语法错误: {file}")
    
    # 2. 检查基础模型
    print("\n📋 检查基础模型...")
    model_files = [
        ("app/models/base.py", "基础模型"),
        ("app/models/user.py", "用户模型"),
        ("app/models/project.py", "项目模型"),
        ("app/models/task.py", "任务模型"),
        ("app/models/annotation.py", "标注模型"),
    ]
    for file, desc in model_files:
        if not check_file_exists(file, desc):
            errors.append(f"缺失模型文件: {file}")
        elif not check_python_syntax(file):
            errors.append(f"语法错误: {file}")
    
    # 3. 检查API路由
    print("\n📋 检查API路由...")
    api_files = [
        ("app/api/deps.py", "依赖注入"),
        ("app/api/v1/auth.py", "认证API"),
        ("app/api/v1/users.py", "用户API"),
        ("app/api/v1/projects.py", "项目API"),
        ("app/api/v1/tasks.py", "任务API"),
        ("app/api/v1/annotations.py", "标注API"),
        ("app/api/v1/annotations_3d.py", "3D标注API"),
        ("app/api/v1/export.py", "导出API"),
        ("app/api/v1/auto_label.py", "自动标注API"),
        ("app/api/v1/quality.py", "质量控制API"),
    ]
    for file, desc in api_files:
        if not check_file_exists(file, desc):
            errors.append(f"缺失API文件: {file}")
        elif not check_python_syntax(file):
            errors.append(f"语法错误: {file}")
    
    # 4. 检查主入口
    print("\n📋 检查主入口...")
    if not check_file_exists("app/main.py", "主入口"):
        errors.append("缺失主入口: app/main.py")
    elif not check_python_syntax("app/main.py"):
        errors.append("语法错误: app/main.py")
    
    # 5. 检查前端文件
    print("\n📋 检查前端文件...")
    frontend_files = [
        ("../frontend/package.json", "前端配置"),
        ("../frontend/src/main.tsx", "前端入口"),
        ("../frontend/src/App.tsx", "前端主组件"),
        ("../frontend/src/services/api.ts", "API服务"),
    ]
    for file, desc in frontend_files:
        full_path = base_path / file
        if full_path.exists():
            print(f"✅ {desc}: {file}")
        else:
            print(f"❌ 缺失 {desc}: {file}")
            errors.append(f"缺失前端文件: {file}")
    
    # 6. 汇总
    print("\n" + "="*60)
    if errors:
        print(f"❌ 检查失败，发现 {len(errors)} 个问题:")
        for err in errors:
            print(f"   - {err}")
        return 1
    else:
        print("✅ 项目检查通过！所有文件完整且语法正确。")
        return 0

if __name__ == "__main__":
    sys.exit(main())
