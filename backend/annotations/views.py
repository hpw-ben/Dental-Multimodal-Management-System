from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from .models import PatientAnnotation, Reply
from .serializers import PatientAnnotationSerializer, ReplySerializer


class PatientAnnotationViewSet(viewsets.ModelViewSet):
    """患者标记 ViewSet"""
    queryset = PatientAnnotation.objects.all()
    serializer_class = PatientAnnotationSerializer
    permission_classes = [IsAuthenticated]

    def _get_notification_queryset_for_user(self, user):
        """根据用户角色获取通知范围"""
        queryset = PatientAnnotation.objects.all()

        if user.role == 'researcher':
            return queryset.filter(created_by=user)

        return queryset

    def get_queryset(self):
        """支持按患者过滤: ?patient=<patient_id>"""
        queryset = super().get_queryset()
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)
        return queryset

    def perform_create(self, serializer):
        """自动设置创建者为当前用户"""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'], url_path='add-reply')
    def add_reply(self, request, pk=None):
        """为指定标记添加回复

        POST /api/annotations/{id}/add-reply/
        Body: { "content": "回复内容" }
        """
        annotation = self.get_object()
        serializer = ReplySerializer(data={
            'annotation': annotation.id,
            'content': request.data.get('content'),
            'created_by': request.user.id
        })
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='notification-stats')
    def notification_stats(self, request):
        """获取通知统计

        GET /api/annotations/notification-stats/
        Response: { "unread_count": 5 }
        """
        user = request.user

        queryset = self._get_notification_queryset_for_user(user)

        # 排除已查看的
        unread_count = queryset.exclude(viewed_by=user).count()

        return Response({'unread_count': unread_count})

    @action(detail=False, methods=['get'], url_path='notifications')
    def notifications_list(self, request):
        """获取通知列表

        GET /api/annotations/notifications/
        Response: { "count": 10, "results": [...] }
        """
        user = request.user

        queryset = self._get_notification_queryset_for_user(user)

        # 序列化（包含is_read字段）
        from . import serializers as ann_serializers
        serializer = ann_serializers.NotificationSerializer(
            queryset,
            many=True,
            context={'request': request}
        )
        
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['post'], url_path='mark-as-read')
    def mark_as_read(self, request, pk=None):
        """标记通知已读

        POST /api/annotations/{id}/mark-as-read/
        """
        annotation = get_object_or_404(self._get_notification_queryset_for_user(request.user), pk=pk)
        annotation.viewed_by.add(request.user)
        return Response({'detail': '已标记为已读'})

    @action(detail=False, methods=['post'], url_path='mark-all-read')
    def mark_all_read(self, request):
        """全部标记已读

        POST /api/annotations/mark-all-read/
        """
        user = request.user

        queryset = self._get_notification_queryset_for_user(user).exclude(viewed_by=user)

        count = queryset.count()

        # 批量添加已读标记
        for annotation in queryset:
            annotation.viewed_by.add(user)

        return Response({
            'detail': '已全部标记为已读',
            'count': count
        })
