"""
预填充牙位图标签数据
将现有硬编码标签迁移到数据库
"""
from django.db import migrations


def populate_dental_labels(apps, schema_editor):
    """填充默认牙位图标签数据"""
    DentalLabel = apps.get_model('imaging', 'DentalLabel')
    
    default_labels = [
        # 颜色标记 (color)
        {'label_id': 'filling-resin', 'label': '充填(树脂)', 'label_type': 'color', 'value': 'filled-resin', 'color': '#ef4444', 'sort_order': 1},
        {'label_id': 'filling-amalgam', 'label': '充填(银汞)', 'label_type': 'color', 'value': 'filled-amalgam', 'color': '#8b5cf6', 'sort_order': 2},
        {'label_id': 'filling-gic', 'label': '充填(玻璃离子)', 'label_type': 'color', 'value': 'filled-gic', 'color': '#22c55e', 'sort_order': 3},
        {'label_id': 'missing', 'label': '缺失', 'label_type': 'color', 'value': 'missing', 'color': '#654321', 'sort_order': 4},
        {'label_id': 'crown', 'label': '牙冠', 'label_type': 'color', 'value': 'crown', 'color': '#f97316', 'sort_order': 5},
        {'label_id': 'caries', 'label': '龋齿', 'label_type': 'color', 'value': 'caries', 'color': '#dc2626', 'sort_order': 6},
        # 符号标记 (symbol)
        {'label_id': 'sym-R', 'label': '根管治疗 (R)', 'label_type': 'symbol', 'value': 'R', 'color': '', 'sort_order': 1},
        {'label_id': 'sym-M', 'label': '缺失 (M)', 'label_type': 'symbol', 'value': 'M', 'color': '', 'sort_order': 2},
        {'label_id': 'sym-C', 'label': '龋齿 (C)', 'label_type': 'symbol', 'value': 'C', 'color': '', 'sort_order': 3},
        {'label_id': 'sym-F', 'label': '骨折 (F)', 'label_type': 'symbol', 'value': 'F', 'color': '', 'sort_order': 4},
    ]
    
    for label_data in default_labels:
        DentalLabel.objects.get_or_create(
            label_id=label_data['label_id'],
            defaults=label_data,
        )


def reverse_populate(apps, schema_editor):
    """反向迁移：删除预填充数据"""
    DentalLabel = apps.get_model('imaging', 'DentalLabel')
    DentalLabel.objects.filter(label_id__in=[
        'filling-resin', 'filling-amalgam', 'filling-gic',
        'missing', 'crown', 'caries',
        'sym-R', 'sym-M', 'sym-C', 'sym-F',
    ]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('imaging', '0003_add_dental_label'),
    ]

    operations = [
        migrations.RunPython(populate_dental_labels, reverse_populate),
    ]
