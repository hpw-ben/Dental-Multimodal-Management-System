from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientAnnotationViewSet

router = DefaultRouter()
router.register(r'annotations', PatientAnnotationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
