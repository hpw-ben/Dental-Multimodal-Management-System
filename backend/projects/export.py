"""
课题数据集导出模块

提供课题数据的 ZIP 格式导出功能，支持三种导出模式：
  - cases_only:  仅病例数据
  - with_charts: 病例 + 牙位图
  - full:        病例 + 牙位图 + 影像文件
"""
import json
import zipfile
from io import BytesIO
from datetime import date

from patients.models import Patient
from imaging.models import DentalChart, ImagingFile
from imaging.dental_translator import translate_dental_chart # 新增：导入翻译器

# 导出模式可选值
EXPORT_MODE_CHOICES = ('cases_only', 'with_charts', 'full')

GENDER_MAP = {'Male': '男', 'Female': '女'}


# ────────────────────────── 辅助函数 ──────────────────────────

def _build_dataset_info(project, anonymize, patient_count, image_stats):
    """构建 dataset_info.json 内容"""
    return {
        'project_title': project.title,
        'project_description': project.description or '',
        'export_date': date.today().isoformat(),
        'anonymized': anonymize,
        'statistics': {
            'patient_count': patient_count,
            **image_stats,
        },
    }


def calculate_age(birth_date):
    """根据出生日期计算年龄"""
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def _build_patient_list(patients, patient_id_map, anonymize):
    """构建患者列表"""
    result = []
    for p in patients:
        pid = str(p.id)
        entry = {
            'patient_id': patient_id_map.get(pid, pid) if anonymize else pid,
            'case_number': p.case_number,
            'gender': p.gender,
            'birth_year': p.birth_date.year if p.birth_date else None,
            'age': calculate_age(p.birth_date) if p.birth_date else None,
            'status': p.status,
            'completeness_score': p.completeness_score,  # 新增：完整度评分
            'created_at': str(p.created_at),
        }
        if not anonymize:
            entry['name'] = p.name
        result.append(entry)
    return result


def _build_dental_charts(patients, patient_id_map, anonymize):
    """构建标准化牙位图数据"""
    patient_ids = [p.id for p in patients]
    charts = DentalChart.objects.filter(patient_id__in=patient_ids).select_related('patient')
    result = []
    for chart in charts:
        pid = str(chart.patient_id)
        display_pid = patient_id_map.get(pid, pid) if anonymize else pid
        
        # 使用翻译器将JSON翻译为标准化格式
        translated = translate_dental_chart(chart.chart_data, display_pid)
        translated['updated_at'] = chart.updated_at.isoformat() if chart.updated_at else ''
        result.append(translated)
    return result


# ────────────────────────── 主导出函数 ──────────────────────────

def export_project_dataset(project, anonymize=True, export_mode='full', confirmed_only=True, patient_ids=None):
    """
    将课题数据导出为 ZIP 文件流

    导出模式：
        cases_only  - 仅病例数据
        with_charts - 病例 + 牙位图
        full        - 病例 + 牙位图 + 影像文件

    目录结构（full 模式）：
        {project_title}_dataset/
        ├── dataset_info.json
        ├── patients.json
        ├── dental_charts.json    (with_charts / full)
        └── imaging/              (full)
            ├── {patient_id}/
            │   ├── image_001.dcm
            │   └── ...
            └── ...

    Args:
        project: Project 实例
        anonymize: 是否匿名化患者信息
        export_mode: 导出模式 (cases_only / with_charts / full)
        confirmed_only: 仅导出状态为「已确认」的患者（默认 True）
        patient_ids: 可选，指定要导出的患者ID列表。如果提供了该参数，confirmed_only参数将被忽略

    Returns:
        BytesIO: 包含 ZIP 文件内容的字节流
    """
    # 获取课题下患者
    qs = project.patients.all().prefetch_related('visit_records')
    
    if patient_ids:
        # 如果提供了患者ID列表，只导出选中的患者
        qs = qs.filter(id__in=patient_ids)
    elif confirmed_only:
        # 否则根据confirmed_only参数筛选
        qs = qs.filter(status='已确认')
    
    patients = list(qs.order_by('created_at'))

    # 构建匿名映射
    patient_ids = [str(p.id) for p in patients]
    patient_id_map = {pid: f'P{str(i + 1).zfill(4)}' for i, pid in enumerate(patient_ids)}

    # 构建患者数据
    patients_data = _build_patient_list(patients, patient_id_map, anonymize)

    # 判断是否包含牙位图 / 影像
    include_charts = export_mode in ('with_charts', 'full')
    include_imaging = export_mode == 'full'

    # 影像统计（full 模式需要实际查询；其他模式仅统计数量）
    image_stats = {'image_count': 0, 'dcm_count': 0, 'jpg_count': 0, 'png_count': 0}
    imaging_files = []
    if include_imaging:
        imaging_files = list(
            ImagingFile.objects.filter(
                patient_id__in=patient_ids
            ).select_related('patient').order_by('patient_id', 'file_name')
        )
        for img in imaging_files:
            image_stats['image_count'] += 1
            lower_name = img.file_name.lower()
            if lower_name.endswith('.dcm'):
                image_stats['dcm_count'] += 1
            elif lower_name.endswith('.jpg') or lower_name.endswith('.jpeg'):
                image_stats['jpg_count'] += 1
            elif lower_name.endswith('.png'):
                image_stats['png_count'] += 1

    # 构建牙位图数据
    dental_charts_data = []
    if include_charts:
        dental_charts_data = _build_dental_charts(patients, patient_id_map, anonymize)

    # 构建元信息
    dataset_info = _build_dataset_info(
        project, anonymize,
        len(patients), image_stats,
    )
    dataset_info['export_mode'] = export_mode
    dataset_info['confirmed_only'] = confirmed_only
    dataset_info['statistics']['dental_chart_count'] = len(dental_charts_data)

    # 打包 ZIP
    safe_title = project.title.replace('/', '_').replace('\\', '_')
    root_dir = f'{safe_title}_dataset'

    output = BytesIO()
    with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zf:
        # dataset_info.json
        zf.writestr(
            f'{root_dir}/dataset_info.json',
            json.dumps(dataset_info, ensure_ascii=False, indent=2),
        )

        # patients.json
        zf.writestr(
            f'{root_dir}/patients.json',
            json.dumps(patients_data, ensure_ascii=False, indent=2),
        )

        # dental_charts.json（with_charts / full）
        if include_charts:
            zf.writestr(
                f'{root_dir}/dental_charts.json',
                json.dumps(dental_charts_data, ensure_ascii=False, indent=2),
            )

        # 影像文件（full）
        if include_imaging:
            for img in imaging_files:
                pid = str(img.patient_id)
                folder_name = patient_id_map.get(pid, pid) if anonymize else pid
                try:
                    with img.file_path.open('rb') as f:
                        file_data = f.read()
                    zf.writestr(
                        f'{root_dir}/imaging/{folder_name}/{img.file_name}',
                        file_data,
                    )
                except (FileNotFoundError, OSError):
                    # 物理文件缺失时跳过，不中断导出
                    continue

    output.seek(0)
    return output
