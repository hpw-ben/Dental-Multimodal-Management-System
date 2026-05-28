"""
用户应用路由
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, AuditLogViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'audit-logs', AuditLogViewSet, basename='auditlog')

urlpatterns = [
    path('', include(router.urls)),
]
