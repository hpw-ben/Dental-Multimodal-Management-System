"""
项目序列化器
"""
from rest_framework import serializers
from .models import Project, ProjectMember, ProjectPatient
from users.serializers import UserSerializer
from patients.serializers import PatientListSerializer


class ProjectMemberSerializer(serializers.ModelSerializer):
    """项目成员序列化器"""
    
    user_detail = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = ProjectMember
        fields = ['id', 'project', 'user', 'user_detail', 'joined_at']
        read_only_fields = ['id', 'joined_at']


class ProjectPatientSerializer(serializers.ModelSerializer):
    """项目患者序列化器"""
    
    patient_detail = PatientListSerializer(source='patient', read_only=True)
    
    class Meta:
        model = ProjectPatient
        fields = ['id', 'project', 'patient', 'patient_detail', 'added_at']
        read_only_fields = ['id', 'added_at']


class ProjectSerializer(serializers.ModelSerializer):
    """项目详情序列化器"""
    
    # 嵌套显示成员和患者
    projectmember_set = ProjectMemberSerializer(many=True, read_only=True)
    projectpatient_set = ProjectPatientSerializer(many=True, read_only=True)
    
    # 统计数据
    patient_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    
    # 负责人信息（取第一个加入的成员作为负责人）
    principal = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description',
            'created_at', 'updated_at',
            'projectmember_set', 'projectpatient_set',
            'patient_count', 'member_count', 'principal'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_patient_count(self, obj):
        """获取患者数量"""
        return obj.projectpatient_set.count()
    
    def get_member_count(self, obj):
        """获取成员数量"""
        return obj.projectmember_set.count()
    
    def get_principal(self, obj):
        """获取负责人（第一个加入的成员）"""
        first_member = obj.projectmember_set.order_by('joined_at').first()
        if first_member:
            return UserSerializer(first_member.user, context=self.context).data
        return None


class ProjectListSerializer(serializers.ModelSerializer):
    """项目列表序列化器（简化版）"""
    
    patient_count = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()
    principal = serializers.SerializerMethodField()
    
    class Meta:
        model = Project
        fields = [
            'id', 'title', 'description',
            'created_at', 'patient_count', 'member_count', 'principal'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_patient_count(self, obj):
        return obj.projectpatient_set.count()
    
    def get_member_count(self, obj):
        return obj.projectmember_set.count()
    
    def get_principal(self, obj):
        first_member = obj.projectmember_set.order_by('joined_at').first()
        if first_member:
            avatar_url = None
            if first_member.user.avatar:
                request = self.context.get('request')
                if request:
                    avatar_url = request.build_absolute_uri(first_member.user.avatar.url)
                else:
                    avatar_url = first_member.user.avatar.url
            
            return {
                'id': first_member.user.id,
                'name': first_member.user.username,
                'email': first_member.user.email,
                'avatar': avatar_url
            }
        return None


class ProjectCreateSerializer(serializers.ModelSerializer):
    """项目创建序列化器"""
    
    # 创建时可以直接添加成员
    member_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Project
        fields = ['title', 'description', 'member_ids']
    
    def create(self, validated_data):
        """创建项目并添加成员（创建者自动成为首位成员）"""
        member_ids = validated_data.pop('member_ids', [])
        project = Project.objects.create(**validated_data)

        # 将创建者加为首位成员
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            ProjectMember.objects.get_or_create(
                project=project,
                user=request.user,
            )

        # 添加其他项目成员
        for user_id in member_ids:
            if request and user_id == request.user.id:
                continue  # 创建者已添加，跳过
            ProjectMember.objects.create(
                project=project,
                user_id=user_id
            )
        
        return project
