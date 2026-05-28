"""
患者应用路由
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, VisitRecordViewSet
from .dashboard_views import dashboard_stats

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'visit-records', VisitRecordViewSet, basename='visitrecord')

urlpatterns = [
    path('dashboard/', dashboard_stats, name='dashboard-stats'),
    path('', include(router.urls)),
]
