"""
影像资料应用路由
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DentalChartViewSet, ImagingFileViewSet, DentalLabelViewSet

router = DefaultRouter()
router.register(r'dental-charts', DentalChartViewSet, basename='dentalchart')
router.register(r'imaging-files', ImagingFileViewSet, basename='imagingfile')
router.register(r'dental-labels', DentalLabelViewSet, basename='dentallabel')

urlpatterns = [
    path('', include(router.urls)),
]
