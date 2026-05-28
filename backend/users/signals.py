"""
Signal 处理器
用于自动记录审计日志
"""
from django.db import OperationalError, ProgrammingError, connection
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import AuditLog


def get_client_ip(request):
    """获取客户端 IP 地址"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def create_audit_log(instance, action, request=None, changes=None):
    """创建审计日志"""
    # 获取当前请求的用户
    user = None
    ip_address = None
    user_agent = ''
    
    if request and hasattr(request, 'user') and request.user.is_authenticated:
        user = request.user
        ip_address = get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

    audit_log_table_name = AuditLog._meta.db_table
    if audit_log_table_name not in connection.introspection.table_names():
        return

    try:
        AuditLog.objects.create(
            user=user,
            action=action,
            model_name=instance.__class__.__name__,
            object_id=str(instance.pk),
            object_repr=str(instance),
            changes=changes or {},
            ip_address=ip_address,
            user_agent=user_agent[:500] if user_agent else ''
        )
    except (OperationalError, ProgrammingError):
        return


def should_audit(instance):
    """判断模型是否需要审计"""
    # 审计日志自身不需要审计
    if instance.__class__.__name__ in ['AuditLog', 'EmailVerificationCode', 'Session', 'LogEntry', 'Reply']:
        return False
    return True


# 在中间件中保存 request 对象
_thread_locals = {}


def set_current_request(request):
    """设置当前请求"""
    _thread_locals['request'] = request


def get_current_request():
    """获取当前请求"""
    return _thread_locals.get('request', None)


@receiver(post_save)
def log_model_create_or_update(sender, instance, created, **kwargs):
    """记录模型的创建和更新"""
    if kwargs.get('raw', False):
        return

    if not should_audit(instance):
        return
    
    request = get_current_request()
    action = 'CREATE' if created else 'UPDATE'
    
    # 对于更新操作，尝试获取变更内容
    changes = {}
    if not created and hasattr(instance, '_changed_data'):
        changes = instance._changed_data
    
    create_audit_log(instance, action, request, changes)


@receiver(post_delete)
def log_model_delete(sender, instance, **kwargs):
    """记录模型的删除"""
    if kwargs.get('raw', False):
        return

    if not should_audit(instance):
        return
    
    request = get_current_request()
    create_audit_log(instance, 'DELETE', request)
