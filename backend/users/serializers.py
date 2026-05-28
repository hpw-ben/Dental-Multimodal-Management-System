"""
用户序列化器
"""
from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import User, AuditLog


DASHBOARD_GRID_COLUMNS = 12
DASHBOARD_WIDGET_DEFINITIONS = {
    'metric_total_projects': {'min_w': 3, 'min_h': 2, 'resizable': False},
    'metric_total_patients': {'min_w': 3, 'min_h': 2, 'resizable': False},
    'metric_pending_patients': {'min_w': 3, 'min_h': 2, 'resizable': False},
    'metric_new_patients_month': {'min_w': 3, 'min_h': 2, 'resizable': False},
    'trend_chart': {'min_w': 6, 'min_h': 4, 'resizable': True},
    'distribution_chart': {'min_w': 6, 'min_h': 4, 'resizable': True},
    'quick_actions': {'min_w': 6, 'min_h': 4, 'resizable': True},
    'recent_activity': {'min_w': 6, 'min_h': 4, 'resizable': True},
}


class UserSerializer(serializers.ModelSerializer):
    """用户序列化器"""
    avatar = serializers.SerializerMethodField()
    
    def get_avatar(self, obj):
        """获取头像完整URL"""
        if obj.avatar:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        return None
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'role', 'avatar', 'dashboard_layout',
            'is_active', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserCreateSerializer(serializers.ModelSerializer):
    """用户创建序列化器（管理员创建，无需设置密码）"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'avatar']
        read_only_fields = ['id']
    
    def validate_email(self, value):
        """验证邮箱唯一性"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("该邮箱已被使用")
        return value


class SetPasswordSerializer(serializers.Serializer):
    """通过令牌设置密码序列化器（新用户首次激活）"""
    
    token = serializers.CharField(required=True, max_length=255)
    password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """验证两次密码是否一致"""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({"password": "两次密码不一致"})
        return attrs


class UserUpdateSerializer(serializers.ModelSerializer):
    """用户更新序列化器"""
    
    class Meta:
        model = User
        fields = ['username', 'email', 'role', 'avatar', 'is_active']


class DashboardLayoutSerializer(serializers.Serializer):
    """首页布局序列化器"""

    dashboard_layout = serializers.JSONField()

    def validate_dashboard_layout(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError('首页布局必须为对象')

        version = value.get('version')
        if version != 1:
            raise serializers.ValidationError('首页布局版本无效')

        home = value.get('home')
        if not isinstance(home, dict):
            raise serializers.ValidationError('首页布局缺少 home 配置')

        widgets = home.get('widgets')
        if not isinstance(widgets, list):
            raise serializers.ValidationError('首页组件列表必须为数组')

        seen_widget_ids = set()
        occupied_areas = []

        for widget in widgets:
            if not isinstance(widget, dict):
                raise serializers.ValidationError('首页组件配置必须为对象')

            widget_id = widget.get('id')
            if widget_id not in DASHBOARD_WIDGET_DEFINITIONS:
                raise serializers.ValidationError(f'存在无效组件：{widget_id}')

            if widget_id in seen_widget_ids:
                raise serializers.ValidationError(f'组件重复：{widget_id}')
            seen_widget_ids.add(widget_id)

            for field_name in ['x', 'y', 'w', 'h']:
                field_value = widget.get(field_name)
                if not isinstance(field_value, int):
                    raise serializers.ValidationError(f'组件 {widget_id} 的 {field_name} 必须为整数')

            x = widget['x']
            y = widget['y']
            width = widget['w']
            height = widget['h']

            if x < 0 or y < 0:
                raise serializers.ValidationError(f'组件 {widget_id} 的位置不能为负数')

            if width <= 0 or height <= 0:
                raise serializers.ValidationError(f'组件 {widget_id} 的尺寸必须大于 0')

            widget_definition = DASHBOARD_WIDGET_DEFINITIONS[widget_id]
            min_width = widget_definition['min_w']
            min_height = widget_definition['min_h']

            if width < min_width or height < min_height:
                raise serializers.ValidationError(
                    f'组件 {widget_id} 的尺寸不能小于 {min_width}x{min_height}'
                )

            if not widget_definition['resizable'] and (width != min_width or height != min_height):
                raise serializers.ValidationError(
                    f'组件 {widget_id} 的尺寸必须固定为 {min_width}x{min_height}'
                )

            if x + width > DASHBOARD_GRID_COLUMNS:
                raise serializers.ValidationError(f'组件 {widget_id} 超出首页网格宽度')

            widget_area = {
                'id': widget_id,
                'left': x,
                'right': x + width,
                'top': y,
                'bottom': y + height,
            }

            for occupied_area in occupied_areas:
                has_horizontal_overlap = widget_area['left'] < occupied_area['right'] and widget_area['right'] > occupied_area['left']
                has_vertical_overlap = widget_area['top'] < occupied_area['bottom'] and widget_area['bottom'] > occupied_area['top']
                if has_horizontal_overlap and has_vertical_overlap:
                    raise serializers.ValidationError(
                        f"组件 {widget_id} 与组件 {occupied_area['id']} 位置重叠"
                    )

            occupied_areas.append(widget_area)

        return value


class ChangePasswordSerializer(serializers.Serializer):
    """修改密码序列化器（已登录用户）"""
    
    old_password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """验证新密码"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "两次密码不一致"})
        return attrs


class LoginSerializer(serializers.Serializer):
    """登录序列化器"""
    
    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )


class SendVerificationCodeSerializer(serializers.Serializer):
    """发送验证码序列化器（仅用于找回密码）"""
    
    email = serializers.EmailField(required=True)


class VerifyCodeAndResetPasswordSerializer(serializers.Serializer):
    """验证验证码并重置密码序列化器"""
    
    email = serializers.EmailField(required=True)
    code = serializers.CharField(max_length=6, required=True)
    new_password = serializers.CharField(
        required=True,
        validators=[validate_password],
        style={'input_type': 'password'}
    )
    new_password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'}
    )
    
    def validate(self, attrs):
        """验证新密码"""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password": "两次密码不一致"})
        return attrs


class RequestEmailChangeSerializer(serializers.Serializer):
    """请求修改邮箱序列化器"""
    
    new_email = serializers.EmailField(required=True)
    
    def validate_new_email(self, value):
        """验证新邮箱"""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("该邮箱已被使用")
        return value


class ConfirmEmailChangeSerializer(serializers.Serializer):
    """确认邮箱变更序列化器"""
    
    token = serializers.CharField(required=True, max_length=255)


class AuditLogSerializer(serializers.ModelSerializer):
    """审计日志序列化器"""
    
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'user', 'user_name', 'action', 'model_name',
            'object_id', 'object_repr', 'changes',
            'ip_address', 'user_agent', 'created_at'
        ]
        read_only_fields = fields
