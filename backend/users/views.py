# -*- coding: utf-8 -*-
"""
用户视图集
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import authenticate, login, logout
from django.core.mail import send_mail
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.middleware.csrf import get_token
from .models import User, AuditLog
from .verification import VerificationCodeManager, SetPasswordTokenManager, EmailChangeTokenManager
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    ChangePasswordSerializer, LoginSerializer,
    SendVerificationCodeSerializer, VerifyCodeAndResetPasswordSerializer,
    SetPasswordSerializer, AuditLogSerializer,
    RequestEmailChangeSerializer, ConfirmEmailChangeSerializer,
    DashboardLayoutSerializer
)


class UserViewSet(viewsets.ModelViewSet):
    """用户视图集"""
    
    queryset = User.objects.all()
    serializer_class = UserSerializer
    
    def get_serializer_class(self):
        """根据动作选择序列化器"""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_permissions(self):
        """设置权限"""
        if self.action in ['login', 'send_reset_code', 'reset_password', 'set_password', 'csrf_token',
                          'confirm_email_change', 'revert_email_change']:
            return [AllowAny()]
        return [IsAuthenticated()]

    def _get_recommended_dashboard_layout(self, role):
        base_widgets = [
            {'id': 'metric_total_projects', 'x': 0, 'y': 0, 'w': 3, 'h': 2},
            {'id': 'metric_total_patients', 'x': 3, 'y': 0, 'w': 3, 'h': 2},
            {'id': 'metric_pending_patients', 'x': 6, 'y': 0, 'w': 3, 'h': 2},
            {'id': 'metric_new_patients_month', 'x': 9, 'y': 0, 'w': 3, 'h': 2},
        ]

        role_widget_orders = {
            'admin': [
                {'id': 'quick_actions', 'x': 0, 'y': 2, 'w': 6, 'h': 4},
                {'id': 'recent_activity', 'x': 6, 'y': 2, 'w': 6, 'h': 4},
                {'id': 'trend_chart', 'x': 0, 'y': 6, 'w': 6, 'h': 4},
                {'id': 'distribution_chart', 'x': 6, 'y': 6, 'w': 6, 'h': 4},
            ],
            'researcher': [
                {'id': 'trend_chart', 'x': 0, 'y': 2, 'w': 6, 'h': 4},
                {'id': 'distribution_chart', 'x': 6, 'y': 2, 'w': 6, 'h': 4},
                {'id': 'quick_actions', 'x': 0, 'y': 6, 'w': 6, 'h': 4},
                {'id': 'recent_activity', 'x': 6, 'y': 6, 'w': 6, 'h': 4},
            ],
            'doctor': [
                {'id': 'quick_actions', 'x': 0, 'y': 2, 'w': 6, 'h': 4},
                {'id': 'recent_activity', 'x': 6, 'y': 2, 'w': 6, 'h': 4},
                {'id': 'distribution_chart', 'x': 0, 'y': 6, 'w': 6, 'h': 4},
                {'id': 'trend_chart', 'x': 6, 'y': 6, 'w': 6, 'h': 4},
            ],
        }

        return {
            'version': 1,
            'home': {
                'widgets': base_widgets + role_widget_orders.get(role, role_widget_orders['doctor'])
            }
        }
    
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    @method_decorator(ensure_csrf_cookie)
    def csrf_token(self, request):
        """获取CSRF Token（供前端使用）"""
        return Response({
            'detail': 'CSRF cookie set',
            'csrfToken': get_token(request)
        })
    
    def create(self, request, *args, **kwargs):
        """创建用户（管理员）并发送激活邮件"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # 保存用户（无密码）
        user = serializer.save()
        
        # 生成设置密码令牌
        token = SetPasswordTokenManager.create_token(user.email)
        
        # 构造激活链接
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        activation_link = f"{frontend_url}/activate?token={token}"
        
        # 发送激活邮件
        try:
            send_mail(
                subject='设置密码',
                message=f'''您好 {user.username}，

管理员已为您创建了账号。

请点击以下链接设置您的密码（链接24小时内有效）：
{activation_link}



此邮件由系统自动发送，请勿回复。
''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f'邮件发送失败: {e}')
            print(f'[激活链接] {user.email}: {activation_link}')
        
        headers = self.get_success_headers(serializer.data)
        return Response({
            'user': serializer.data,
            'message': f'用户创建成功，激活邮件已发送至 {user.email}',
            'activation_link': activation_link  # 开发环境返回链接
        }, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    @method_decorator(csrf_exempt)
    def set_password(self, request):
        """通过令牌设置密码（新用户激活）"""
        serializer = SetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            print(f'[set_password] 验证失败: {serializer.errors}')
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        # 验证令牌
        print(f'[set_password] token={token[:8]}...')
        email = SetPasswordTokenManager.verify_token(token)
        if not email:
            return Response(
                {'detail': '令牌无效或已过期'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取用户
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 设置密码并激活用户
        user.set_password(password)
        user.is_active = True
        user.save()
        
        return Response({
            'message': '密码设置成功，您现在可以登录了',
            'user': UserSerializer(user).data
        })
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    @method_decorator(csrf_exempt)
    def login(self, request):
        """登录（免CSRF），含失败次数限制和未激活检测"""
        from django.core.cache import cache

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data['email']
        password = serializer.validated_data['password']

        MAX_ATTEMPTS = 3
        LOCKOUT_SECONDS = 300  # 锁定 5 分钟
        cache_key = f'login_attempts:{email}'

        # 检查是否处于锁定期
        attempts = cache.get(cache_key, 0)
        if attempts >= MAX_ATTEMPTS:
            ttl = cache.ttl(cache_key) if hasattr(cache, 'ttl') else LOCKOUT_SECONDS
            remaining = ttl if ttl and ttl > 0 else LOCKOUT_SECONDS
            minutes = (remaining + 59) // 60
            return Response(
                {'detail': f'登录失败次数过多，请 {minutes} 分钟后再试', 'code': 'locked'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            # 累计失败次数
            cache.set(cache_key, attempts + 1, LOCKOUT_SECONDS)
            remaining = MAX_ATTEMPTS - attempts - 1
            detail = '邮箱或密码错误'
            if remaining <= 1:
                detail += f'，还可尝试 {remaining} 次'
            return Response(
                {'detail': detail},
                status=status.HTTP_401_UNAUTHORIZED
            )

        # 检查用户是否已激活
        if not user_obj.is_active:
            return Response(
                {'detail': '该账户尚未启用，请联系管理员', 'code': 'inactive'},
                status=status.HTTP_403_FORBIDDEN
            )

        authenticated_user = authenticate(request, username=user_obj.username, password=password)

        if authenticated_user is not None:
            # 登录成功，清除失败计数
            cache.delete(cache_key)
            login(request, authenticated_user)
            return Response({
                'user': UserSerializer(authenticated_user).data,
                'message': '登录成功'
            })
        else:
            # 密码错误，累计失败次数
            cache.set(cache_key, attempts + 1, LOCKOUT_SECONDS)
            remaining = MAX_ATTEMPTS - attempts - 1
            detail = '邮箱或密码错误'
            if remaining <= 1:
                detail += f'，还可尝试 {remaining} 次'
            return Response(
                {'detail': detail},
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    @action(detail=False, methods=['post'])
    def logout(self, request):
        """登出"""
        logout(request)
        return Response({'message': '登出成功'})
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """获取当前用户信息"""
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard_layout(self, request):
        """获取当前用户首页布局"""
        current_layout = request.user.dashboard_layout or {
            'version': 1,
            'home': {
                'widgets': []
            }
        }
        return Response({'dashboard_layout': current_layout})

    @action(detail=False, methods=['patch'])
    def update_dashboard_layout(self, request):
        """保存当前用户首页布局"""
        serializer = DashboardLayoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        request.user.dashboard_layout = serializer.validated_data['dashboard_layout']
        request.user.save(update_fields=['dashboard_layout'])

        return Response({
            'message': '首页布局已保存',
            'dashboard_layout': request.user.dashboard_layout,
        })

    @action(detail=False, methods=['post'])
    def reset_dashboard_layout(self, request):
        """恢复当前用户首页推荐布局"""
        recommended_layout = self._get_recommended_dashboard_layout(request.user.role)
        request.user.dashboard_layout = recommended_layout
        request.user.save(update_fields=['dashboard_layout'])

        return Response({
            'message': '已恢复推荐布局',
            'dashboard_layout': recommended_layout,
        })
    
    @action(detail=True, methods=['post'])
    def change_password(self, request, pk=None):
        """修改密码（已登录用户）"""
        user = self.get_object()
        
        if user != request.user:
            return Response(
                {'detail': '无权修改他人密码'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'detail': '原密码错误'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        return Response({'message': '密码修改成功'})
    
    @action(detail=False, methods=['post'])
    def upload_avatar(self, request):
        """上传头像"""
        if 'avatar' not in request.FILES:
            return Response(
                {'detail': '请选择头像文件'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        avatar_file = request.FILES['avatar']
        
        # 验证文件类型
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response(
                {'detail': '仅支持 JPG、PNG、GIF、WebP 格式'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 验证文件大小（最大2MB）
        max_size = 2 * 1024 * 1024
        if avatar_file.size > max_size:
            return Response(
                {'detail': '头像文件不能超过 2MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = request.user
        
        # 删除旧头像文件
        if user.avatar:
            user.avatar.delete(save=False)
        
        user.avatar = avatar_file
        user.save()
        
        return Response({
            'message': '头像上传成功',
            'avatar': request.build_absolute_uri(user.avatar.url)
        })
    
    @action(detail=False, methods=['post'])
    def request_email_change(self, request):
        """请求修改邮箱：向新邮箱发确认链接，向旧邮箱发通知+回退链接"""
        serializer = RequestEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        old_email = user.email
        new_email = serializer.validated_data['new_email']
        
        if old_email == new_email:
            return Response(
                {'detail': '新邮箱与当前邮箱相同'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 生成确认令牌和回退令牌
        confirm_token, revert_token = EmailChangeTokenManager.create_tokens(
            user.id, old_email, new_email
        )
        
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        confirm_link = f"{frontend_url}/confirm-email?token={confirm_token}"
        revert_link = f"{frontend_url}/revert-email?token={revert_token}"
        
        # 向新邮箱发送确认链接
        try:
            send_mail(
                subject='确认邮箱变更',
                message=f'''您好，

有人请求将系统账号的邮箱更改为此地址。

请点击以下链接确认变更（链接1小时内有效）：
{confirm_link}

如果这不是您本人的操作，请忽略此邮件。

此邮件由系统自动发送，请勿回复。
''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[new_email],
                fail_silently=False,
            )
        except Exception as e:
            print(f'确认邮件发送失败: {e}')
        
        # 向旧邮箱发送通知 + 回退链接
        try:
            send_mail(
                subject='邮箱变更通知',
                message=f'''您好 {user.username}，

您的账号正在请求将邮箱从 {old_email} 更改为 {new_email}。

如果这不是您本人的操作，请立即点击以下链接撤销变更（链接1小时内有效）：
{revert_link}

此邮件由系统自动发送，请勿回复。
''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[old_email],
                fail_silently=False,
            )
        except Exception as e:
            print(f'通知邮件发送失败: {e}')
        
        return Response({
            'message': f'确认链接已发送至 {new_email}，请查收邮件完成验证'
        })

    @action(detail=True, methods=['post'])
    def request_email_change_for_user(self, request, pk=None):
        """管理员为指定用户请求修改邮箱"""
        if request.user.role != 'admin':
            return Response(
                {'detail': '仅管理员可以修改其他用户邮箱'},
                status=status.HTTP_403_FORBIDDEN
            )

        target_user = self.get_object()
        serializer = RequestEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        old_email = target_user.email
        new_email = serializer.validated_data['new_email']

        if old_email == new_email:
            return Response(
                {'detail': '新邮箱与当前邮箱相同'},
                status=status.HTTP_400_BAD_REQUEST
            )

        confirm_token, revert_token = EmailChangeTokenManager.create_tokens(
            target_user.id, old_email, new_email
        )

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        confirm_link = f"{frontend_url}/confirm-email?token={confirm_token}"
        revert_link = f"{frontend_url}/revert-email?token={revert_token}"

        try:
            send_mail(
                subject='确认邮箱变更',
                message=f'''您好，

管理员正在将系统账号的邮箱更改为此地址。

请点击以下链接确认变更（链接1小时内有效）：
{confirm_link}

如果这不是您本人的操作，请忽略此邮件。

此邮件由系统自动发送，请勿回复。
''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[new_email],
                fail_silently=False,
            )
        except Exception as e:
            print(f'确认邮件发送失败: {e}')

        try:
            send_mail(
                subject='邮箱变更通知',
                message=f'''您好 {target_user.username}，

管理员正在将您的账号邮箱从 {old_email} 更改为 {new_email}。

如果这不是您本人的操作，请立即点击以下链接撤销变更（链接1小时内有效）：
{revert_link}

此邮件由系统自动发送，请勿回复。
''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[old_email],
                fail_silently=False,
            )
        except Exception as e:
            print(f'通知邮件发送失败: {e}')

        return Response({
            'message': f'确认链接已发送至 {new_email}，请查收邮件完成验证'
        })
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    @method_decorator(csrf_exempt)
    def confirm_email_change(self, request):
        """确认邮箱变更（用户点击新邮箱中的确认链接）"""
        serializer = ConfirmEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        data = EmailChangeTokenManager.verify_confirm_token(token)
        
        if not data:
            return Response(
                {'detail': '链接无效或已过期'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=data['user_id'])
        except User.DoesNotExist:
            return Response(
                {'detail': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 更新邮箱
        user.email = data['new_email']
        user.save()
        
        return Response({
            'message': f'邮箱已成功更改为 {data["new_email"]}'
        })
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    @method_decorator(csrf_exempt)
    def revert_email_change(self, request):
        """撤销邮箱变更（用户点击旧邮箱中的回退链接）"""
        serializer = ConfirmEmailChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        data = EmailChangeTokenManager.verify_revert_token(token)
        
        if not data:
            return Response(
                {'detail': '链接无效或已过期'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            user = User.objects.get(id=data['user_id'])
        except User.DoesNotExist:
            return Response(
                {'detail': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 回退邮箱
        user.email = data['old_email']
        user.save()
        
        return Response({
            'message': f'邮箱已恢复为 {data["old_email"]}'
        })
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    @method_decorator(csrf_exempt)
    def send_reset_code(self, request):
        """发送找回密码验证码"""
        serializer = SendVerificationCodeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        # 检查用户是否存在
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': '该邮箱未注册'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 检查限流
        if not VerificationCodeManager.can_send(email):
            return Response(
                {'detail': '验证码已发送，请1分钟后再试'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        # 生成验证码
        code = VerificationCodeManager.generate_code()
        
        # 保存到缓存（5分钟过期）
        VerificationCodeManager.save_code(email, code)
        
        # 发送邮件
        try:
            send_mail(
                subject='系统验证码',
                message=f'''您好 {user.username}，

您的验证码是：{code}

验证码有效期5分钟，请勿泄露给他人。

如果这不是您本人的操作，请忽略此邮件。

此邮件由系统自动发送，请勿回复。
''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            print(f'邮件发送失败: {e}')
            print(f'[验证码] {email} - {code}')
        
        return Response({
            'message': '验证码已发送',
            'expires_in': 300
        })
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    @method_decorator(csrf_exempt)
    def reset_password(self, request):
        """通过验证码重置密码"""
        serializer = VerifyCodeAndResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        new_password = serializer.validated_data['new_password']
        
        # 验证验证码（使用缓存）
        if not VerificationCodeManager.verify_code(email, code):
            return Response(
                {'detail': '验证码错误或已过期'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # 获取用户
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'detail': '用户不存在'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # 重置密码
        user.set_password(new_password)
        user.save()
        
        return Response({'message': '密码重置成功'})

    @action(detail=True, methods=['post'])
    def send_password_reset_link(self, request, pk=None):
        """管理员为指定用户发送密码重置链接"""
        if request.user.role != 'admin':
            return Response(
                {'detail': '仅管理员可以为其他用户发送重置密码链接'},
                status=status.HTTP_403_FORBIDDEN
            )

        target_user = self.get_object()
        token = SetPasswordTokenManager.create_token(target_user.email)

        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
        reset_link = f"{frontend_url}/reset-password?token={token}&type=reset-link"

        try:
            send_mail(
                subject='重置密码',
                message=f'''您好 {target_user.username}，

管理员已为您发起密码重置。

请点击以下链接重新设置您的密码（链接24小时内有效）：
{reset_link}

如果这不是您本人的操作，请忽略此邮件。

此邮件由系统自动发送，请勿回复。
''',
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[target_user.email],
                fail_silently=False,
            )
        except Exception as e:
            print(f'密码重置邮件发送失败: {e}')
            print(f'[密码重置链接] {target_user.email}: {reset_link}')

        return Response({
            'message': f'重置密码链接已发送至 {target_user.email}',
            'reset_link': reset_link
        })


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """审计日志视图集(只读)"""
    
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """过滤查询集"""
        queryset = super().get_queryset()
        
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        action = self.request.query_params.get('action')
        if action:
            queryset = queryset.filter(action=action)
        
        model_name = self.request.query_params.get('model_name')
        if model_name:
            queryset = queryset.filter(model_name=model_name)
        
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        return queryset
