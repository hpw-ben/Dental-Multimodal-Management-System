from django.contrib import admin
from .models import PatientAnnotation, Reply


@admin.register(PatientAnnotation)
class PatientAnnotationAdmin(admin.ModelAdmin):
    list_display = ['patient', 'content_preview', 'created_by', 'created_at', 'reply_count']
    list_filter = ['created_at', 'created_by']
    search_fields = ['content', 'patient__name']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'created_at'

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = '内容预览'

    def reply_count(self, obj):
        return obj.replies.count()
    reply_count.short_description = '回复数'


@admin.register(Reply)
class ReplyAdmin(admin.ModelAdmin):
    list_display = ['annotation', 'content_preview', 'created_by', 'created_at']
    list_filter = ['created_at', 'created_by']
    search_fields = ['content', 'annotation__content']
    readonly_fields = ['id', 'created_at']
    date_hierarchy = 'created_at'

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = '内容预览'
