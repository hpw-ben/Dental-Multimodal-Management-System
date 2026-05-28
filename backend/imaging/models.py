"""
影像资料管理模型
包括牙位图和影像文件
"""
import uuid
from django.db import models


class DentalChart(models.Model):
    """牙位图模型"""
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='牙位图ID'
    )
    patient = models.OneToOneField(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='dental_chart',
        verbose_name='患者'
    )
    chart_data = models.JSONField(
        default=dict,
        verbose_name='牙位图数据',
        help_text='存储牙齿状态（牙位编号、表面位置、颜色、符号）'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name='更新时间'
    )
    
    class Meta:
        verbose_name = '牙位图'
        verbose_name_plural = '牙位图'
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"{self.patient.name} 的牙位图"


class ImagingFile(models.Model):
    """影像资料模型"""
    
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
        verbose_name='影像ID'
    )
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='imaging_files',
        verbose_name='患者'
    )
    file_name = models.CharField(max_length=255, verbose_name='文件名')
    file_path = models.FileField(
        upload_to='imaging/%Y/%m/%d/',
        verbose_name='存储路径'
    )
    file_size = models.BigIntegerField(
        verbose_name='文件大小（字节）'
    )
    series_name = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name='序列名称',
        help_text='用于标识 DICOM series，同一 series 的文件使用相同的名称'
    )
    uploaded_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='上传日期'
    )
    
    class Meta:
        verbose_name = '影像资料'
        verbose_name_plural = '影像资料'
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.patient.name} - {self.file_name}"
    
    def delete(self, *args, **kwargs):
        """删除记录时同步删除物理文件"""
        if self.file_path:
            # 删除物理文件
            self.file_path.delete(save=False)
        super().delete(*args, **kwargs)


class DentalLabel(models.Model):
    """牙位图标签模型 - 管理员可自定义"""
    
    TYPE_CHOICES = [
        ('color', '颜色标记'),
        ('symbol', '符号标记'),
    ]
    
    label_id = models.CharField(
        max_length=50,
        unique=True,
        verbose_name='标签ID',
        help_text='用于存储在牙位图数据中的唯一标识，如 filled-resin'
    )
    label = models.CharField(
        max_length=50,
        verbose_name='显示名称',
        help_text='前端显示的中文名称，如 充填(树脂)'
    )
    label_type = models.CharField(
        max_length=10,
        choices=TYPE_CHOICES,
        verbose_name='标签类型'
    )
    value = models.CharField(
        max_length=50,
        verbose_name='数据值',
        help_text='存入 chart_data 的值，如 filled-resin'
    )
    color = models.CharField(
        max_length=20,
        blank=True,
        default='',
        verbose_name='颜色',
        help_text='仅颜色标记需要，如 #ef4444'
    )
    sort_order = models.IntegerField(
        default=0,
        verbose_name='排序'
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name='是否启用'
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name='创建时间'
    )
    
    class Meta:
        verbose_name = '牙位图标签'
        verbose_name_plural = '牙位图标签'
        ordering = ['label_type', 'sort_order']
    
    def __str__(self):
        return f"{self.label} ({self.label_id})"
