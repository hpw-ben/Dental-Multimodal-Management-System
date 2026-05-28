"""
影像资料视图集
"""
import zipfile
import os
from django.core.files.base import ContentFile
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from patients.models import Patient
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import DentalChart, ImagingFile, DentalLabel
from .serializers import (
    DentalChartSerializer, ImagingFileSerializer, ImagingFileUploadSerializer,
    DentalLabelSerializer
)

VALID_EXTENSIONS = {'.dcm', '.jpg', '.jpeg', '.png'}


class DentalLabelViewSet(viewsets.ModelViewSet):
    """牙位图标签视图集 - 管理员可CRUD，普通用户只读"""
    
    queryset = DentalLabel.objects.all()
    serializer_class = DentalLabelSerializer
    pagination_class = None  # 标签数量少，禁用分页返回完整列表
    
    def get_permissions(self):
        """GET 请求所有认证用户可访问，其他操作仅管理员"""
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAdminUser()]
    
    def get_queryset(self):
        """非管理员只能看到启用的标签"""
        queryset = super().get_queryset()
        if not self.request.user.is_staff and self.request.user.role != 'admin':
            queryset = queryset.filter(is_active=True)
        return queryset


class DentalChartViewSet(viewsets.ModelViewSet):
    """牙位图视图集"""
    
    queryset = DentalChart.objects.all()
    serializer_class = DentalChartSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['patient']
    
    @action(detail=False, methods=['get'])
    def by_patient(self, request):
        """根据患者ID获取牙位图"""
        patient_id = request.query_params.get('patient_id')
        
        if not patient_id:
            return Response(
                {'detail': '缺少 patient_id'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            chart = DentalChart.objects.get(patient_id=patient_id)
            serializer = self.get_serializer(chart)
            return Response(serializer.data)
        except DentalChart.DoesNotExist:
            return Response(
                {'detail': '该患者暂无牙位图'},
                status=status.HTTP_404_NOT_FOUND
            )


class ImagingFileViewSet(viewsets.ModelViewSet):
    """影像文件视图集"""
    
    queryset = ImagingFile.objects.all()
    serializer_class = ImagingFileSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['patient']
    ordering_fields = ['uploaded_at', 'file_size']
    ordering = ['-uploaded_at']
    pagination_class = None  # 禁用分页，返回所有结果
    
    def get_serializer_class(self):
        """根据动作选择序列化器"""
        if self.action == 'create':
            return ImagingFileUploadSerializer
        return ImagingFileSerializer

    @action(detail=False, methods=['post'], url_path='upload-zip')
    def upload_zip(self, request):
        """上传压缩包，后端解压并批量创建影像文件"""
        zip_file = request.FILES.get('file')
        patient_id = request.data.get('patient_id')

        if not zip_file:
            return Response({'detail': '缺少压缩包文件'}, status=status.HTTP_400_BAD_REQUEST)
        if not patient_id:
            return Response({'detail': '缺少 patient_id'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            patient = Patient.objects.get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response({'detail': '患者不存在'}, status=status.HTTP_404_NOT_FOUND)

        if not zipfile.is_zipfile(zip_file):
            return Response({'detail': '文件不是有效的 ZIP 格式'}, status=status.HTTP_400_BAD_REQUEST)

        zip_file.seek(0)
        created_files = []
        skipped = 0

        # DICOM 文件自动归为同一 series
        series_name = ''
        dcm_names = []

        with zipfile.ZipFile(zip_file, 'r') as zf:
            for entry in zf.infolist():
                if entry.is_dir():
                    continue
                file_name = os.path.basename(entry.filename)
                # 跳过 macOS 资源文件和隐藏文件
                if entry.filename.startswith('__MACOSX') or file_name.startswith('.'):
                    continue
                ext = os.path.splitext(file_name)[1].lower()
                if ext not in VALID_EXTENSIONS:
                    skipped += 1
                    continue
                if ext == '.dcm':
                    dcm_names.append(entry.filename)

            # 多个 DICOM 文件时生成 series 名称
            if len(dcm_names) > 1:
                from datetime import datetime
                tag = datetime.now().strftime('%m%d_%H%M')
                series_name = f'S_{tag}'

            for entry in zf.infolist():
                if entry.is_dir():
                    continue
                file_name = os.path.basename(entry.filename)
                if entry.filename.startswith('__MACOSX') or file_name.startswith('.'):
                    continue
                ext = os.path.splitext(file_name)[1].lower()
                if ext not in VALID_EXTENSIONS:
                    continue

                data = zf.read(entry.filename)
                content_file = ContentFile(data, name=file_name)

                # 去重：删除同患者同文件名的旧记录
                ImagingFile.objects.filter(
                    patient=patient, file_name=file_name
                ).delete()

                imaging_file = ImagingFile.objects.create(
                    patient=patient,
                    file_name=file_name,
                    file_path=content_file,
                    file_size=len(data),
                    series_name=series_name if ext == '.dcm' else '',
                )
                created_files.append(imaging_file)

        serializer = ImagingFileSerializer(
            created_files, many=True, context={'request': request}
        )
        return Response({
            'created': len(created_files),
            'skipped': skipped,
            'files': serializer.data,
        }, status=status.HTTP_201_CREATED)
