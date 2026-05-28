"""
患者模型后台管理配置
"""
from django.contrib import admin
from .models import Patient, VisitRecord


class VisitRecordInline(admin.TabularInline):
    """就诊记录内联显示"""
    model = VisitRecord
    extra = 0
    fields = ['visit_date', 'visit_notes']


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    """患者后台管理"""
    
    list_display = ['case_number', 'name', 'gender', 'birth_date', 'status', 'created_at']
    list_filter = ['gender', 'status', 'created_at']
    search_fields = ['name', 'case_number']
    date_hierarchy = 'created_at'
    inlines = [VisitRecordInline]
    
    fieldsets = (
        ('基本信息', {
            'fields': ('name', 'case_number', 'gender', 'birth_date', 'clinical_diagnosis')
        }),
        ('状态信息', {
            'fields': ('status',)
        }),
    )


@admin.register(VisitRecord)
class VisitRecordAdmin(admin.ModelAdmin):
    """就诊记录后台管理"""
    
    list_display = ['patient', 'visit_date']
    list_filter = ['visit_date']
    search_fields = ['patient__name', 'visit_notes']
    date_hierarchy = 'visit_date'
