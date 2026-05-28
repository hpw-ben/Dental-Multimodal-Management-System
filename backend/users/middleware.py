"""
审计日志中间件
用于捕获请求信息
"""
from users.signals import set_current_request


class AuditLogMiddleware:
    """审计日志中间件"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # 设置当前请求到 thread local
        set_current_request(request)
        
        response = self.get_response(request)
        
        return response
