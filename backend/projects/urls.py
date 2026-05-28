"""
项目应用路由
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProjectViewSet, ProjectMemberViewSet, ProjectPatientViewSet

router = DefaultRouter()
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'project-members', ProjectMemberViewSet, basename='projectmember')
router.register(r'project-patients', ProjectPatientViewSet, basename='projectpatient')

urlpatterns = [
    path('', include(router.urls)),
]
