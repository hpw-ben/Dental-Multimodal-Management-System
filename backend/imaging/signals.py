"""
影像和牙位图模型信号
用于自动更新患者数据完整性评分
"""
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import DentalChart, ImagingFile


@receiver(post_save, sender=DentalChart)
def update_score_on_chart_save(sender, instance, **kwargs):
    """牙位图创建/更新时更新患者评分"""
    if kwargs.get('raw', False):
        return

    instance.patient.calculate_and_save_completeness()


@receiver(post_delete, sender=DentalChart)
def update_score_on_chart_delete(sender, instance, **kwargs):
    """牙位图删除时更新患者评分"""
    instance.patient.calculate_and_save_completeness()


@receiver(post_save, sender=ImagingFile)
def update_score_on_imaging_save(sender, instance, created, **kwargs):
    """影像文件创建时更新患者评分"""
    if kwargs.get('raw', False):
        return

    if created:
        instance.patient.calculate_and_save_completeness()


@receiver(post_delete, sender=ImagingFile)
def update_score_on_imaging_delete(sender, instance, **kwargs):
    """影像文件删除时更新患者评分"""
    instance.patient.calculate_and_save_completeness()
