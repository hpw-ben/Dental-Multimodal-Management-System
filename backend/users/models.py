"""
用户模型
包括自定义用户模型和角色选择
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    自定义用户模型
    继承 Django 的 AbstractUser，添加角色和头像字段
    """
    
    class RoleChoices(models.TextChoices):
        ADMIN = 'admin', '管理员'
        DOCTOR = 'doctor', '医生'
        RESEARCHER = 'researcher', '研究员'
    
    # username, email, password 等字段由 AbstractUser 提供
    # 设置 email 为必填且唯一
    email = models.EmailField(unique=True, verbose_name='邮箱')
    
    # 扩展字段
    role = models.CharField(
        max_length=20,
        choices=RoleChoices.choices,
        default=RoleChoices.DOCTOR,
        verbose_name='角色类型'
    )
    avatar = models.ImageField(
        upload_to='avatars/',
        blank=True,
        null=True,
        verbose_name='头像'
    )
    dashboard_layout = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='首页布局配置'
    )
    
    class Meta:
        verbose_name = '用户'
        verbose_name_plural = ' 用户'
        ordering = ['-date_joined']
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class AuditLog(models.Model):
    """审计日志模型"""
    
    class ActionChoices(models.TextChoices):
        CREATE = 'CREATE', '创建'
        UPDATE = 'UPDATE', '更新'
        DELETE = 'DELETE', '删除'
    
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs',
        verbose_name='操作用户'
    )
    action = models.CharField(
        max_length=10,
        choices=ActionChoices.choices,
        verbose_name='操作类型'
    )
    model_name = models.CharField(max_length=100, verbose_name='模型名称')
    object_id = models.CharField(max_length=255, verbose_name='对象ID')
    object_repr = models.CharField(max_length=255, verbose_name='对象描述')
    changes = models.JSONField(
        default=dict,
        blank=True,
        verbose_name='变更内容'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='IP地址'
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name='User Agent'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    
    class Meta:
        verbose_name = '审计日志'
        verbose_name_plural = '审计日志'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['model_name', 'created_at']),
        ]
    
    def __str__(self):
        username = self.user.username if self.user else '未知用户'
        return f"{username} {self.get_action_display()} {self.model_name} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"
