# Project-related API routes
from fastapi import APIRouter

router = APIRouter()


@router.get("/projects")
def list_projects():
    return {"message": "项目列表"}


@router.post("/projects")
def create_project():
    return {"message": "创建项目"}
