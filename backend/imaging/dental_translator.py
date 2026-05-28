"""
牙位图数据标准化翻译器
将JSON格式的牙位图数据翻译成统一的专业术语，便于科研训练
"""


def _get_label_mappings():
    """从数据库动态获取标签映射，硬编码作为回退"""
    # 默认硬编码映射（数据库不可用时的回退）
    treatment_mapping = {
        'filled-resin': '树脂充填',
        'filled-amalgam': '银汞充填',
        'filled-gic': '玻璃离子充填',
        'missing': '缺失',
        'crown': '牙冠',
        'caries': '龋齿',
        'clear': '',
    }
    symbol_mapping = {
        'R': '根管治疗',
        'M': '缺失',
        'C': '龋齿',
        'F': '骨折',
    }
    
    try:
        from .models import DentalLabel
        labels = DentalLabel.objects.filter(is_active=True)
        for label in labels:
            if label.label_type == 'color':
                treatment_mapping[label.value] = label.label
            elif label.label_type == 'symbol':
                symbol_mapping[label.value] = label.label
    except Exception:
        pass  # 数据库不可用时使用硬编码
    
    return treatment_mapping, symbol_mapping

# 牙面映射（中文）
SURFACE_MAPPING = {
    'B': '颊侧',
    'L': '舌侧',
    'M': '近中',
    'D': '远中',
    'O': '咬合面',
}

# FDI牙位命名（恒牙和乳牙）
TOOTH_NAMES = {
    # 恒牙上颌右侧 (Quadrant 1)
    18: '右上第三磨牙',
    17: '右上第二磨牙',
    16: '右上第一磨牙',
    15: '右上第二前磨牙',
    14: '右上第一前磨牙',
    13: '右上尖牙',
    12: '右上侧切牙',
    11: '右上中切牙',
    
    # 恒牙上颌左侧 (Quadrant 2)
    21: '左上中切牙',
    22: '左上侧切牙',
    23: '左上尖牙',
    24: '左上第一前磨牙',
    25: '左上第二前磨牙',
    26: '左上第一磨牙',
    27: '左上第二磨牙',
    28: '左上第三磨牙',
    
    # 恒牙下颌左侧 (Quadrant 3)
    31: '左下中切牙',
    32: '左下侧切牙',
    33: '左下尖牙',
    34: '左下第一前磨牙',
    35: '左下第二前磨牙',
    36: '左下第一磨牙',
    37: '左下第二磨牙',
    38: '左下第三磨牙',
    
    # 恒牙下颌右侧 (Quadrant 4)
    48: '右下第三磨牙',
    47: '右下第二磨牙',
    46: '右下第一磨牙',
    45: '右下第二前磨牙',
    44: '右下第一前磨牙',
    43: '右下尖牙',
    42: '右下侧切牙',
    41: '右下中切牙',
    
    # 乳牙上颌右侧 (Quadrant 5)
    55: '右上第二乳磨牙',
    54: '右上第一乳磨牙',
    53: '右上乳尖牙',
    52: '右上乳侧切牙',
    51: '右上乳中切牙',
    
    # 乳牙上颌左侧 (Quadrant 6)
    61: '左上乳中切牙',
    62: '左上乳侧切牙',
    63: '左上乳尖牙',
    64: '左上第一乳磨牙',
    65: '左上第二乳磨牙',
    
    # 乳牙下颌左侧 (Quadrant 7)
    71: '左下乳中切牙',
    72: '左下乳侧切牙',
    73: '左下乳尖牙',
    74: '左下第一乳磨牙',
    75: '左下第二乳磨牙',
    
    # 乳牙下颌右侧 (Quadrant 8)
    85: '右下第二乳磨牙',
    84: '右下第一乳磨牙',
    83: '右下乳尖牙',
    82: '右下乳侧切牙',
    81: '右下乳中切牙',
}


def translate_dental_chart(chart_data: dict, patient_id: str) -> dict:
    """
    将牙位图JSON数据翻译为标准化格式
    
    Args:
        chart_data: 原始牙位图JSON数据 {'treatments': {...}, 'symbols': [...]}
        patient_id: 患者ID（可能已匿名化）
    
    Returns:
        标准化的牙位图数据
    """
    if not chart_data:
        return {
            'patient_id': patient_id,
            'dental_records': [],
            'record_count': 0
        }
    
    # 从数据库动态获取映射
    treatment_mapping, symbol_mapping = _get_label_mappings()
    
    records = []
    
    # 1. 处理treatments（牙面治疗）
    treatments = chart_data.get('treatments', {})
    for tooth_num_str, surfaces in treatments.items():
        tooth_num = int(tooth_num_str)
        for surface_code, treatment_code in surfaces.items():
            # 跳过清除状态
            if treatment_code == 'clear' or not treatment_code:
                continue
                
            record = {
                'tooth_number': tooth_num,
                'tooth_name': TOOTH_NAMES.get(tooth_num, f'{tooth_num}号牙'),
                'fdi_notation': str(tooth_num),
                'surface': SURFACE_MAPPING.get(surface_code, surface_code),
                'surface_code': surface_code,
                'treatment': treatment_mapping.get(treatment_code, treatment_code),
                'treatment_code': treatment_code
            }
            records.append(record)
    
    # 2. 处理symbols（特殊标记）
    symbols = chart_data.get('symbols', [])
    for symbol in symbols:
        if not symbol.get('value'):  # 跳过空值
            continue
            
        tooth_num = symbol['tooth']
        record = {
            'tooth_number': tooth_num,
            'tooth_name': TOOTH_NAMES.get(tooth_num, f'{tooth_num}号牙'),
            'fdi_notation': str(tooth_num),
            'surface': '全牙',
            'surface_code': 'WHOLE',
            'special_marker': symbol_mapping.get(symbol['value'], symbol['value']),
            'marker_code': symbol['value']
        }
        records.append(record)
    
    # 按牙位编号排序
    records.sort(key=lambda x: x['tooth_number'])
    
    return {
        'patient_id': patient_id,
        'dental_records': records,
        'record_count': len(records)
    }
