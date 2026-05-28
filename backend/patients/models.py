"""
患者管理模型
包括患者基本信息和就诊记录
"""
import uuid
from django.db import models


class Patient(models.Model):
    """患者模型"""
    
    class GenderChoices(models.TextChoices):
        MALE = 'Male', '男'
        FEMALE = 'Female', '女'
    
    class StatusChoices(models.TextChoices):
        CONFIRMED = '已确认', '已确认'
        PENDING = '待确认', '待确认'
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='患者ID'
    )
    name = models.CharField(max_length=100, verbose_name='患者姓名')
    case_number = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='病案号'
    )
    gender = models.CharField(
        max_length=10,
        choices=GenderChoices.choices,
        verbose_name='性别'
    )
    birth_date = models.DateField(verbose_name='出生日期')
    created_at = models.DateField(
        auto_now_add=True,
        verbose_name='建档日期'
    )
    status = models.CharField(
        max_length=10,
        choices=StatusChoices.choices,
        default=StatusChoices.PENDING,
        verbose_name='状态'
    )
    clinical_diagnosis = models.TextField(
        blank=True,
        default='',
        verbose_name='临床诊断'
    )
    
    # 数据完整度评分（极简版）
    completeness_score = models.IntegerField(
        default=0,
        verbose_name='数据完整度评分',
        help_text='0-100分，基于牙位图和影像文件'
    )
    
    class Meta:
        verbose_name = '患者'
        verbose_name_plural = '患者'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.case_number})"
    
    def calculate_completeness(self):
        """计算数据完整性评分（极简版）
        
        评分规则：
        - 有牙位图 = 50分
        - 有影像文件 = 50分
        """
        score = 0
        
        # 有牙位图 +50分（使用try-except检查OneToOne关系）
        try:
            if self.dental_chart:
                score += 50
        except:
            pass
        
        # 有影像文件 +50分
        if self.imaging_files.exists():
            score += 50
        
        return score
    
    def calculate_and_save_completeness(self):
        """计算并保存评分"""
        self.completeness_score = self.calculate_completeness()
        self.save(update_fields=['completeness_score'])


class VisitRecord(models.Model):
    """就诊记录模型"""
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='记录ID'
    )
    patient = models.ForeignKey(
        Patient,
        on_delete=models.CASCADE,
        related_name='visit_records',
        verbose_name='患者'
    )
    visit_date = models.DateField(verbose_name='就诊日期')
    visit_notes = models.TextField(
        blank=True,
        verbose_name='就诊记录'
    )
    
    class Meta:
        verbose_name = '就诊记录'
        verbose_name_plural = '就诊记录'
        ordering = ['-visit_date']
    
    def __str__(self):
        return f"{self.patient.name} - {self.visit_date}"
