"""
批量计算所有患者的完整性评分
"""
from django.core.management.base import BaseCommand
from patients.models import Patient


class Command(BaseCommand):
    help = '批量计算所有患者的完整性评分'
    
    def handle(self, *args, **options):
        patients = Patient.objects.all()
        total = patients.count()
        
        self.stdout.write(f'开始计算 {total} 位患者的评分...')
        
        updated = 0
        for i, patient in enumerate(patients, 1):
            old_score = patient.completeness_score
            patient.calculate_and_save_completeness()
            new_score = patient.completeness_score
            
            if old_score != new_score:
                updated += 1
            
            if i % 50 == 0:
                self.stdout.write(f'进度: {i}/{total}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'完成！共处理 {total} 位患者，更新了 {updated} 位患者的评分'
            )
        )
