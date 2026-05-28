"""
仪表盘统计视图
"""
from collections import OrderedDict
from datetime import date, timedelta
from django.db.models import Count, Max
from django.db.models.functions import TruncHour, TruncMonth
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Patient
from projects.models import Project
from users.models import AuditLog

# 模型名中文映射
MODEL_NAME_CN = {
    'Patient': '患者',
    'Project': '课题',
    'DentalLabel': '牙位标签',
    'DentalChart': '牙位图',
    'User': '用户',
    'PatientAnnotation': '标记',
    'VisitRecord': '就诊记录',
    'ProjectMember': '课题成员',
    'ProjectPatient': '课题患者',
    'ImagingFile': '影像文件',
}

# 操作动词映射
ACTION_VERB = {
    'CREATE': '新建',
    'UPDATE': '更新',
    'DELETE': '删除',
}

# 模型量词映射
MODEL_UNIT = {
    'Patient': '位',
    'Project': '个',
    'User': '位',
    'PatientAnnotation': '条',
    'VisitRecord': '条',
    'ProjectMember': '位',
    'ProjectPatient': '位',
    'ImagingFile': '个',
}

EXCLUDED_ACTIVITY_MODELS = {'Reply'}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """仪表盘统计数据"""
    today = date.today()

    # 基础统计
    total_projects = Project.objects.count()
    total_patients = Patient.objects.count()
    pending_patients = Patient.objects.filter(status='待确认').count()

    # 本月新增
    first_day_of_month = today.replace(day=1)
    new_projects_this_month = Project.objects.filter(
        created_at__date__gte=first_day_of_month
    ).count()
    new_patients_this_month = Patient.objects.filter(
        created_at__gte=first_day_of_month
    ).count()

    # 今日新增
    new_patients_today = Patient.objects.filter(
        created_at=today
    ).count()

    # 趋势数据：最近 6 个月每月新增患者数
    six_months_ago = today - timedelta(days=180)
    trend_data = (
        Patient.objects
        .filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    trend_list = [
        {'month': item['month'].strftime('%Y-%m'), 'count': item['count']}
        for item in trend_data
    ]

    # 分布数据：按临床诊断分组
    distribution_data = (
        Patient.objects
        .exclude(clinical_diagnosis='')
        .values('clinical_diagnosis')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    distribution_list = [
        {'name': item['clinical_diagnosis'], 'count': item['count']}
        for item in distribution_data
    ]

    # 最近动态：按 (用户, 操作, 模型) 聚合，仅保留有用户的记录
    grouped = (
        AuditLog.objects
        .filter(user__isnull=False)
        .exclude(model_name__in=EXCLUDED_ACTIVITY_MODELS)
        .annotate(hour_bucket=TruncHour('created_at'))
        .values('user__username', 'action', 'model_name', 'hour_bucket')
        .annotate(count=Count('id'), latest=Max('created_at'))
        .order_by('-latest')[:15]
    )

    recent_activities = []
    for item in grouped:
        username = item['user__username']
        action = item['action']
        model = item['model_name']
        count = item['count']

        verb = ACTION_VERB.get(action, action)
        model_cn = MODEL_NAME_CN.get(model, model)
        unit = MODEL_UNIT.get(model, '个')

        if count == 1:
            description = f"{username} {verb}了1{unit}{model_cn}"
        else:
            description = f"{username} {verb}了 {count} {unit}{model_cn}"

        recent_activities.append({
            'action': action,
            'model_name': model_cn,
            'description': description,
            'created_at': item['latest'].isoformat(),
        })

    return Response({
        'metrics': {
            'total_projects': total_projects,
            'total_patients': total_patients,
            'pending_patients': pending_patients,
            'new_projects_this_month': new_projects_this_month,
            'new_patients_this_month': new_patients_this_month,
            'new_patients_today': new_patients_today,
        },
        'trend_data': trend_list,
        'distribution_data': distribution_list,
        'recent_activities': recent_activities,
    })
