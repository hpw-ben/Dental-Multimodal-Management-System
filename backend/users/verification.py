# -*- coding: utf-8 -*-
"""
验证码和令牌工具类
使用 Django 缓存机制存储
"""
from django.core.cache import cache
from django.utils import timezone
import random
import string
import secrets


class VerificationCodeManager:
    """验证码管理器（仅用于找回密码）"""
    
    # 缓存key前缀
    CODE_PREFIX = 'verification_code'
    THROTTLE_PREFIX = 'verification_throttle'
    
    # 过期时间（秒）
    CODE_TIMEOUT = 300  # 5分钟
    THROTTLE_TIMEOUT = 60  # 1分钟
    
    @staticmethod
    def generate_code():
        """生成6位随机验证码"""
        return ''.join(random.choices(string.digits, k=6))
    
    @staticmethod
    def _get_code_key(email):
        """获取验证码缓存key"""
        return f'{VerificationCodeManager.CODE_PREFIX}:{email}'
    
    @staticmethod
    def _get_throttle_key(email):
        """获取限流缓存key"""
        return f'{VerificationCodeManager.THROTTLE_PREFIX}:{email}'
    
    @classmethod
    def can_send(cls, email):
        """检查是否可以发送验证码（限流检查）"""
        throttle_key = cls._get_throttle_key(email)
        return cache.get(throttle_key) is None
    
    @classmethod
    def save_code(cls, email, code):
        """
        保存验证码到缓存
        
        Args:
            email: 邮箱
            code: 验证码
        """
        code_key = cls._get_code_key(email)
        throttle_key = cls._get_throttle_key(email)
        
        # 保存验证码，5分钟过期
        cache.set(code_key, code, cls.CODE_TIMEOUT)
        
        # 设置限流标记，1分钟内不能重复发送
        cache.set(throttle_key, '1', cls.THROTTLE_TIMEOUT)
    
    @classmethod
    def verify_code(cls, email, code):
        """
        验证验证码
        
        Args:
            email: 邮箱
            code: 用户输入的验证码
            
        Returns:
            bool: 验证是否成功
        """
        code_key = cls._get_code_key(email)
        saved_code = cache.get(code_key)
        
        if saved_code is None:
            return False  # 验证码不存在或已过期
        
        if saved_code == code:
            # 验证成功后删除验证码（一次性使用）
            cache.delete(code_key)
            return True
        
        return False


class SetPasswordTokenManager:
    """设置密码令牌管理器（用于新用户激活）"""
    
    TOKEN_PREFIX = 'set_password_token'
    TOKEN_TIMEOUT = 86400  # 24小时
    
    @staticmethod
    def generate_token():
        """生成安全的随机令牌（32字符）"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def _get_token_key(token):
        """获取令牌缓存key"""
        return f'{SetPasswordTokenManager.TOKEN_PREFIX}:{token}'
    
    @classmethod
    def create_token(cls, email):
        """
        创建设置密码令牌
        
        Args:
            email: 用户邮箱
            
        Returns:
            str: 生成的令牌
        """
        token = cls.generate_token()
        token_key = cls._get_token_key(token)
        
        # 存储令牌和邮箱的映射，24小时过期
        cache.set(token_key, email, cls.TOKEN_TIMEOUT)
        
        return token
    
    @classmethod
    def verify_token(cls, token):
        """
        验证令牌并返回邮箱
        
        Args:
            token: 令牌
            
        Returns:
            str or None: 验证成功返回邮箱，失败返回None
        """
        token_key = cls._get_token_key(token)
        email = cache.get(token_key)
        
        if email:
            # 验证成功后删除令牌（一次性使用）
            cache.delete(token_key)
        
        return email
    
    @classmethod
    def invalidate_token(cls, token):
        """使令牌失效"""
        token_key = cls._get_token_key(token)
        cache.delete(token_key)


class EmailChangeTokenManager:
    """邮箱变更令牌管理器"""
    
    CONFIRM_PREFIX = 'email_change_confirm'
    REVERT_PREFIX = 'email_change_revert'
    CONFIRM_TIMEOUT = 3600   # 确认令牌1小时有效
    REVERT_TIMEOUT = 3600    # 回退令牌1小时有效
    
    @staticmethod
    def generate_token():
        """生成安全的随机令牌"""
        return secrets.token_urlsafe(32)
    
    @classmethod
    def create_tokens(cls, user_id, old_email, new_email):
        """
        创建确认令牌和回退令牌
        
        Args:
            user_id: 用户ID
            old_email: 旧邮箱
            new_email: 新邮箱
            
        Returns:
            tuple: (confirm_token, revert_token)
        """
        confirm_token = cls.generate_token()
        revert_token = cls.generate_token()
        
        # 确认令牌：存储 user_id + new_email
        confirm_key = f'{cls.CONFIRM_PREFIX}:{confirm_token}'
        cache.set(confirm_key, {
            'user_id': user_id,
            'old_email': old_email,
            'new_email': new_email,
        }, cls.CONFIRM_TIMEOUT)
        
        # 回退令牌：存储 user_id + old_email
        revert_key = f'{cls.REVERT_PREFIX}:{revert_token}'
        cache.set(revert_key, {
            'user_id': user_id,
            'old_email': old_email,
            'new_email': new_email,
        }, cls.REVERT_TIMEOUT)
        
        return confirm_token, revert_token
    
    @classmethod
    def verify_confirm_token(cls, token):
        """
        验证确认令牌
        
        Returns:
            dict or None: {'user_id', 'old_email', 'new_email'} 或 None
        """
        key = f'{cls.CONFIRM_PREFIX}:{token}'
        data = cache.get(key)
        if data:
            cache.delete(key)
        return data
    
    @classmethod
    def verify_revert_token(cls, token):
        """
        验证回退令牌
        
        Returns:
            dict or None: {'user_id', 'old_email', 'new_email'} 或 None
        """
        key = f'{cls.REVERT_PREFIX}:{token}'
        data = cache.get(key)
        if data:
            cache.delete(key)
        return data

