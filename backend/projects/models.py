"""
科研项目管理模型
包括项目、项目成员、项目患者
"""
import uuid
from django.db import models
from django.conf import settings


class Project(models.Model):
    """科研项目模型"""
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='项目ID'
    )
    title = models.CharField(max_length=200, verbose_name='项目名称')
    description = models.TextField(blank=True, verbose_name='项目描述')
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    # 多对多关系通过中间表实现
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='ProjectMember',
        related_name='projects',
        verbose_name='项目成员'
    )
    patients = models.ManyToManyField(
        'patients.Patient',
        through='ProjectPatient',
        related_name='projects',
        verbose_name='项目患者'
    )
    
    class Meta:
        verbose_name = '科研项目'
        verbose_name_plural = '科研项目'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.title


class ProjectMember(models.Model):
    """项目成员中间表"""
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        verbose_name='项目'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        verbose_name='用户'
    )
    joined_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='加入时间'
    )
    
    class Meta:
        verbose_name = '项目成员'
        verbose_name_plural = '项目成员'
        unique_together = [['project', 'user']]
        ordering = ['-joined_at']
    
    def __str__(self):
        return f"{self.project.title} - {self.user.username}"


class ProjectPatient(models.Model):
    """项目患者中间表"""
    
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        verbose_name='项目'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        verbose_name='患者'
    )
    added_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='添加时间'
    )
    
    class Meta:
        verbose_name = '项目患者'
        verbose_name_plural = '项目患者'
        unique_together = [['project', 'patient']]
        ordering = ['-added_at']
    
    def __str__(self):
        return f"{self.project.title} - {self.patient.name}"
