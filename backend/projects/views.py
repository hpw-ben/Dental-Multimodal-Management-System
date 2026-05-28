"""

项目视图集

"""

import datetime
from django.http import FileResponse
from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Project, ProjectMember, ProjectPatient

from .serializers import (
    ProjectSerializer, ProjectListSerializer, ProjectCreateSerializer,
    ProjectMemberSerializer, ProjectPatientSerializer
)
from .export import export_project_dataset, EXPORT_MODE_CHOICES





class ProjectViewSet(viewsets.ModelViewSet):

    """项目视图集"""

    

    queryset = Project.objects.all()

    serializer_class = ProjectSerializer

    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    

    # 过滤字段（status 已移除）

    filterset_fields = []

    

    # 搜索字段（支持标题、描述、成员用户名）

    search_fields = ['title', 'description', 'members__username']

    

    # 排序字段

    ordering_fields = ['created_at', 'updated_at']

    ordering = ['-created_at']

    

    def get_queryset(self):
        """只返回当前用户所属的课题"""
        qs = super().get_queryset()
        user = self.request.user
        if user.is_authenticated:
            qs = qs.filter(members=user).distinct()
        return qs

    def get_serializer_class(self):

        """根据动作选择序列化器"""

        if self.action == 'list':

            return ProjectListSerializer

        elif self.action == 'create':

            return ProjectCreateSerializer

        return ProjectSerializer

    

    @action(detail=True, methods=['post'])

    def add_member(self, request, pk=None):

        """添加项目成员"""

        project = self.get_object()

        user_id = request.data.get('user_id')

        

        if not user_id:

            return Response(

                {'detail': '缺少 user_id'},

                status=status.HTTP_400_BAD_REQUEST

            )

        

        # 检查是否已存在

        if ProjectMember.objects.filter(project=project, user_id=user_id).exists():

            return Response(

                {'detail': '该用户已是项目成员'},

                status=status.HTTP_400_BAD_REQUEST

            )

        

        member = ProjectMember.objects.create(

            project=project,

            user_id=user_id

        )

        serializer = ProjectMemberSerializer(member)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    

    @action(detail=True, methods=['post'])

    def remove_member(self, request, pk=None):

        """移除项目成员"""

        project = self.get_object()

        user_id = request.data.get('user_id')

        

        try:

            member = ProjectMember.objects.get(project=project, user_id=user_id)

            member.delete()

            return Response({'message': '成员移除成功'})

        except ProjectMember.DoesNotExist:

            return Response(

                {'detail': '该用户不是项目成员'},

                status=status.HTTP_404_NOT_FOUND

            )

    

    @action(detail=True, methods=['post'])

    def add_patient(self, request, pk=None):

        """添加项目患者"""

        project = self.get_object()

        patient_id = request.data.get('patient_id')

        

        if not patient_id:

            return Response(

                {'detail': '缺少 patient_id'},

                status=status.HTTP_400_BAD_REQUEST

            )

        

        # 检查是否已存在

        if ProjectPatient.objects.filter(project=project, patient_id=patient_id).exists():

            return Response(

                {'detail': '该患者已在项目中'},

                status=status.HTTP_400_BAD_REQUEST

            )

        

        project_patient = ProjectPatient.objects.create(

            project=project,

            patient_id=patient_id

        )

        serializer = ProjectPatientSerializer(project_patient)

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    

    @action(detail=True, methods=['post'])

    def remove_patient(self, request, pk=None):

        """移除项目患者"""

        project = self.get_object()

        patient_id = request.data.get('patient_id')

        

        try:

            project_patient = ProjectPatient.objects.get(

                project=project,

                patient_id=patient_id

            )

            project_patient.delete()

            return Response({'message': '患者移除成功'})

        except ProjectPatient.DoesNotExist:

            return Response(

                {'detail': '该患者不在项目中'},

                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def batch_add_patients(self, request, pk=None):
        """批量添加患者到课题"""
        project = self.get_object()
        patient_ids = request.data.get('patient_ids', [])

        if not patient_ids:
            return Response(
                {'detail': '缺少 patient_ids'},
                status=status.HTTP_400_BAD_REQUEST
            )

        added = 0
        skipped = 0
        for pid in patient_ids:
            if ProjectPatient.objects.filter(project=project, patient_id=pid).exists():
                skipped += 1
                continue
            ProjectPatient.objects.create(project=project, patient_id=pid)
            added += 1

        return Response({
            'message': f'成功添加 {added} 位患者，跳过 {skipped} 位已存在患者',
            'added': added,
            'skipped': skipped,
        })

    @action(detail=True, methods=['post'])
    def export_dataset(self, request, pk=None):
        """导出课题数据集为 ZIP 文件"""
        project = self.get_object()

        export_mode = request.data.get('export_mode', 'full')
        if export_mode not in EXPORT_MODE_CHOICES:
            return Response(
                {'detail': f'无效的导出模式，可选值：{", ".join(EXPORT_MODE_CHOICES)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        anonymize = request.data.get('anonymize', True)
        confirmed_only = request.data.get('confirmed_only', True)
        patient_ids = request.data.get('patient_ids', [])  # 新增：选中的患者ID列表

        output = export_project_dataset(
            project,
            anonymize=anonymize,
            export_mode=export_mode,
            confirmed_only=confirmed_only,
            patient_ids=patient_ids if patient_ids else None,  # 新增：传递患者ID列表
        )

        today = datetime.date.today().strftime('%Y%m%d')
        safe_title = project.title.replace('/', '_').replace('\\', '_')
        filename = f'{safe_title}_{today}.zip'

        response = FileResponse(
            output,
            content_type='application/zip',
        )
        response['Content-Disposition'] = f"attachment; filename*=UTF-8''{filename}"
        return response


class ProjectMemberViewSet(viewsets.ModelViewSet):

    """项目成员视图集"""

    

    queryset = ProjectMember.objects.all()

    serializer_class = ProjectMemberSerializer

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ['project', 'user']





class ProjectPatientViewSet(viewsets.ModelViewSet):

    """项目患者视图集"""

    

    queryset = ProjectPatient.objects.all()

    serializer_class = ProjectPatientSerializer

    filter_backends = [DjangoFilterBackend]

    filterset_fields = ['project', 'patient']

