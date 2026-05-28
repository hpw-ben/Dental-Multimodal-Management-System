from rest_framework import serializers
from .models import PatientAnnotation, Reply


class ReplySerializer(serializers.ModelSerializer):
    """回复序列化器"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    created_by_role = serializers.CharField(source='created_by.role', read_only=True)
    created_by_avatar = serializers.SerializerMethodField()

    def get_created_by_avatar(self, obj):
        """获取创建者头像完整URL"""
        if obj.created_by.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.created_by.avatar.url)
            return obj.created_by.avatar.url
        return None

    class Meta:
        model = Reply
        fields = ['id', 'annotation', 'content', 'created_by', 'created_by_name',
                  'created_by_role', 'created_by_avatar', 'created_at']
        read_only_fields = ['id', 'created_at']


class PatientAnnotationSerializer(serializers.ModelSerializer):
    """患者标记序列化器"""
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    created_by_role = serializers.CharField(source='created_by.role', read_only=True)
    created_by_avatar = serializers.SerializerMethodField()
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    replies = ReplySerializer(many=True, read_only=True)
    reply_count = serializers.SerializerMethodField()

    def get_created_by_avatar(self, obj):
        """获取创建者头像完整URL"""
        if obj.created_by.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.created_by.avatar.url)
            return obj.created_by.avatar.url
        return None

    def get_reply_count(self, obj):
        return obj.replies.count()

    class Meta:
        model = PatientAnnotation
        fields = ['id', 'patient', 'patient_name', 'content', 'created_by',
                  'created_by_name', 'created_by_role', 'created_by_avatar', 'created_at',
                  'replies', 'reply_count']
        read_only_fields = ['id', 'created_at', 'created_by']


class NotificationSerializer(serializers.ModelSerializer):
    """通知序列化器（用于通知列表）"""
    patient_id = serializers.UUIDField(source='patient.id', read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    title = serializers.CharField(source='content', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    is_read = serializers.SerializerMethodField()
    
    def get_is_read(self, obj):
        """判断当前用户是否已读"""
        request = self.context.get('request')
        if request and request.user:
            return obj.viewed_by.filter(id=request.user.id).exists()
        return False
    
    class Meta:
        model = PatientAnnotation
        fields = ['id', 'patient_id', 'patient_name', 'title', 
                  'created_by_name', 'created_at', 'is_read']
        read_only_fields = fields
