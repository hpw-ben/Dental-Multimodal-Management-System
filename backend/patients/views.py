"""
患者视图集
"""
import datetime
from django.db.models import Value, IntegerField
from django.db.models.functions import ExtractYear
from django.http import FileResponse
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from django_filters.rest_framework import DjangoFilterBackend
from .models import Patient, VisitRecord
from .serializers import (
    PatientSerializer, PatientListSerializer, PatientCreateSerializer,
    VisitRecordSerializer
)
from .export import export_patients_to_excel


class PatientViewSet(viewsets.ModelViewSet):
    """患者视图集"""
    
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # 过滤字段
    filterset_fields = ['gender', 'status']
    
    # 搜索字段
    search_fields = ['name', 'case_number', 'clinical_diagnosis']
    
    # 排序字段
    ordering_fields = ['created_at', 'birth_date', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """支持年龄范围和诊断关键词过滤"""
        qs = super().get_queryset()
        params = self.request.query_params

        # 诊断关键词过滤
        diagnosis = params.get('diagnosis')
        if diagnosis:
            qs = qs.filter(clinical_diagnosis__icontains=diagnosis)

        # 年龄范围过滤
        current_year = datetime.date.today().year
        min_age = params.get('min_age')
        max_age = params.get('max_age')
        if min_age:
            qs = qs.filter(birth_date__year__lte=current_year - int(min_age))
        if max_age:
            qs = qs.filter(birth_date__year__gte=current_year - int(max_age))

        return qs

    def get_serializer_class(self):
        """根据动作选择序列化器"""
        if self.action == 'list':
            return PatientListSerializer
        elif self.action == 'create':
            return PatientCreateSerializer
        return PatientSerializer

    @action(detail=False, methods=['post'])
    def export_excel(self, request):
        """导出患者列表为 Excel，支持选中患者导出
        
        POST body:
        {
            "patient_ids": ["uuid1", "uuid2", ...]  # 可选，选中的患者ID列表
        }
        
        如果 patient_ids 为空或未提供，则导出当前筛选条件下的所有患者
        """
        patient_ids = request.data.get('patient_ids', [])
        
        if patient_ids:
            # 导出选中的患者
            queryset = Patient.objects.filter(id__in=patient_ids)
        else:
            # 导出所有（应用筛选条件）
            queryset = self.filter_queryset(self.get_queryset())
        
        output = export_patients_to_excel(queryset)
        today = datetime.date.today().strftime('%Y%m%d')
        
        # 根据是否选中调整文件名
        if patient_ids:
            filename = f'患者列表_选中{len(patient_ids)}位_{today}.xlsx'
        else:
            filename = f'患者列表_{today}.xlsx'
        
        response = FileResponse(
            output,
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )
        response['Content-Disposition'] = f"attachment; filename*=UTF-8''{filename}"
        return response


class VisitRecordViewSet(viewsets.ModelViewSet):
    """就诊记录视图集"""
    
    queryset = VisitRecord.objects.all()
    serializer_class = VisitRecordSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    
    # 过滤字段
    filterset_fields = ['patient']
    
    # 排序字段
    ordering_fields = ['visit_date']
    ordering = ['-visit_date']
