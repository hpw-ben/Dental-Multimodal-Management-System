"""
影像资料模型后台管理配置
"""
from django.contrib import admin
from .models import DentalChart, ImagingFile


@admin.register(DentalChart)
class DentalChartAdmin(admin.ModelAdmin):
    """牙位图后台管理"""
    
    list_display = ['patient', 'created_at', 'updated_at']
    search_fields = ['patient__name', 'patient__case_number']
    readonly_fields = ['created_at', 'updated_at']
    autocomplete_fields = ['patient']
    
    fieldsets = (
        ('关联信息', {
            'fields': ('patient',)
        }),
        ('牙位数据', {
            'fields': ('chart_data',)
        }),
        ('时间信息', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ImagingFile)
class ImagingFileAdmin(admin.ModelAdmin):
    """影像资料后台管理"""
    
    list_display = ['patient', 'file_name', 'file_size', 'uploaded_at']
    list_filter = ['uploaded_at']
    search_fields = ['patient__name', 'file_name']
    date_hierarchy = 'uploaded_at'
    readonly_fields = ['file_size', 'uploaded_at']
    autocomplete_fields = ['patient']
    
    def get_readonly_fields(self, request, obj=None):
        """文件上传后不允许修改路径"""
        if obj:  # 编辑时
            return self.readonly_fields + ['file_path']
        return self.readonly_fields
