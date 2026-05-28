"""
项目模型后台管理配置
"""
from django.contrib import admin
from .models import Project, ProjectMember, ProjectPatient


class ProjectMemberInline(admin.TabularInline):
    """项目成员内联显示"""
    model = ProjectMember
    extra = 1
    autocomplete_fields = ['user']


class ProjectPatientInline(admin.TabularInline):
    """项目患者内联显示"""
    model = ProjectPatient
    extra = 1
    autocomplete_fields = ['patient']


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """项目后台管理"""
    
    list_display = ['title', 'created_at', 'updated_at']
    list_filter = ['created_at']
    search_fields = ['title', 'description']
    date_hierarchy = 'created_at'
    inlines = [ProjectMemberInline, ProjectPatientInline]
    
    fieldsets = (
        ('基本信息', {
            'fields': ('title', 'description')
        }),
    )


@admin.register(ProjectMember)
class ProjectMemberAdmin(admin.ModelAdmin):
    """项目成员后台管理"""
    
    list_display = ['project', 'user', 'joined_at']
    list_filter = ['joined_at']
    search_fields = ['project__title', 'user__username']
    autocomplete_fields = ['project', 'user']


@admin.register(ProjectPatient)
class ProjectPatientAdmin(admin.ModelAdmin):
    """项目患者后台管理"""
    
    list_display = ['project', 'patient', 'added_at']
    list_filter = ['added_at']
    search_fields = ['project__title', 'patient__name']
    autocomplete_fields = ['project', 'patient']
