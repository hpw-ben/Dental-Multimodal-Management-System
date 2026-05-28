import uuid
from django.db import models
from django.conf import settings


class PatientAnnotation(models.Model):
    """患者标记（研究员/医生标记的异常/疑问）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name='标记ID')
    patient = models.ForeignKey(
        'patients.Patient',
        on_delete=models.CASCADE,
        related_name='annotations',
        verbose_name='患者'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_annotations',
        verbose_name='创建者'
    )
    content = models.TextField(verbose_name='标记内容')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    viewed_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name='viewed_annotations',
        verbose_name='已查看用户'
    )

    class Meta:
        db_table = 'patient_annotation'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', '-created_at']),
        ]
        verbose_name = '患者标记'
        verbose_name_plural = '患者标记'

    def __str__(self):
        patient_name = self.patient.name if self.patient else '未知患者'
        return f"{patient_name} - {self.content[:20]}"


class Reply(models.Model):
    """回复（针对患者标记的回复）"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, verbose_name='回复ID')
    annotation = models.ForeignKey(
        PatientAnnotation,
        on_delete=models.CASCADE,  # 级联删除：删除标记时自动删除所有回复
        related_name='replies',
        verbose_name='所属标记'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='replies',
        verbose_name='回复者'
    )
    content = models.TextField(verbose_name='回复内容')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='回复时间')

    class Meta:
        db_table = 'reply'
        ordering = ['created_at']  # 正序排列：时间从早到晚
        indexes = [
            models.Index(fields=['annotation', 'created_at']),
        ]
        verbose_name = '标记回复'
        verbose_name_plural = '标记回复'

    def __str__(self):
        annotation_content = self.annotation.content[:20] if self.annotation and self.annotation.content else '未命名标注'
        reply_content = self.content[:20] if self.content else '空回复'
        return f"回复「{annotation_content}」- {reply_content}"
