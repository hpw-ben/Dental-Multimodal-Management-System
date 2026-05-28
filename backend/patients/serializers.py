"""
患者序列化器
"""
from rest_framework import serializers
from .models import Patient, VisitRecord


class VisitRecordSerializer(serializers.ModelSerializer):
    """就诊记录序列化器"""
    
    class Meta:
        model = VisitRecord
        fields = [
            'id', 'patient', 'visit_date', 'visit_notes'
        ]
        read_only_fields = ['id']


class PatientSerializer(serializers.ModelSerializer):
    """患者序列化器"""
    
    # 嵌套显示就诊记录
    visit_records = VisitRecordSerializer(many=True, read_only=True)
    
    # 计算年龄
    age = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'case_number', 'gender', 'birth_date',
            'created_at', 'status', 'clinical_diagnosis', 'age', 'visit_records'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_age(self, obj):
        """计算年龄"""
        from datetime import date
        today = date.today()
        return today.year - obj.birth_date.year - (
            (today.month, today.day) < (obj.birth_date.month, obj.birth_date.day)
        )


class PatientListSerializer(serializers.ModelSerializer):
    """患者列表序列化器（简化版）"""
    
    age = serializers.SerializerMethodField()
    last_visit = serializers.SerializerMethodField()
    
    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'case_number', 'gender', 'birth_date',
            'created_at', 'status', 'clinical_diagnosis', 'age', 'last_visit',
            'completeness_score'  # 新增：完整度评分
        ]
        read_only_fields = ['id', 'created_at', 'completeness_score']
    
    def get_age(self, obj):
        """计算年龄"""
        from datetime import date
        today = date.today()
        return today.year - obj.birth_date.year - (
            (today.month, today.day) < (obj.birth_date.month, obj.birth_date.day)
        )
    
    def get_last_visit(self, obj):
        """获取最后就诊日期"""
        last_record = obj.visit_records.order_by('-visit_date').first()
        if last_record:
            return last_record.visit_date.strftime('%Y-%m-%d')
        return obj.created_at.strftime('%Y-%m-%d')


class PatientCreateSerializer(serializers.ModelSerializer):
    """患者创建序列化器"""
    
    class Meta:
        model = Patient
        fields = [
            'id', 'name', 'case_number', 'gender', 'birth_date', 'status',
            'clinical_diagnosis'
        ]
        read_only_fields = ['id']

