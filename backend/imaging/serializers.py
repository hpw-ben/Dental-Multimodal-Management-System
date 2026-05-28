"""

影像资料序列化器

"""
import uuid

from django.db.models import Max
from rest_framework import serializers

from .models import DentalChart, ImagingFile, DentalLabel




class DentalLabelSerializer(serializers.ModelSerializer):
    """牙位图标签序列化器"""
    
    class Meta:
        model = DentalLabel
        fields = [
            'id', 'label_id', 'label', 'label_type',
            'value', 'color', 'sort_order', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'label_id', 'sort_order', 'created_at']

    def create(self, validated_data):
        """创建标签时自动生成 label_id 和 sort_order"""
        # 自动生成 label_id：类型前缀 + UUID 短串
        label_type = validated_data.get('label_type', 'color')
        prefix = 'sym' if label_type == 'symbol' else label_type
        validated_data['label_id'] = f"{prefix}-{uuid.uuid4().hex[:8]}"

        # 自动递增 sort_order：同类型最大值 + 1
        max_sort = DentalLabel.objects.filter(
            label_type=label_type
        ).aggregate(max_sort=Max('sort_order'))['max_sort'] or 0
        validated_data['sort_order'] = max_sort + 1

        return super().create(validated_data)



class DentalChartSerializer(serializers.ModelSerializer):

    """牙位图序列化器"""

    

    patient_name = serializers.CharField(source='patient.name', read_only=True)

    

    class Meta:

        model = DentalChart

        fields = [

            'id', 'patient', 'patient_name', 'chart_data',

            'created_at', 'updated_at'

        ]

        read_only_fields = ['id', 'created_at', 'updated_at']





class ImagingFileSerializer(serializers.ModelSerializer):

    """影像文件序列化器"""

    

    patient_name = serializers.CharField(source='patient.name', read_only=True)

    file_url = serializers.SerializerMethodField()

    file_size_mb = serializers.SerializerMethodField()

    

    class Meta:

        model = ImagingFile

        fields = [

            'id', 'patient', 'patient_name', 'file_name',

            'file_path', 'file_url', 'file_size', 'file_size_mb',

            'series_name', 'uploaded_at'

        ]

        read_only_fields = ['id', 'file_size', 'uploaded_at']

    

    def get_file_url(self, obj):

        """获取文件 URL"""

        request = self.context.get('request')

        if obj.file_path and request:

            return request.build_absolute_uri(obj.file_path.url)

        return None

    

    def get_file_size_mb(self, obj):

        """文件大小转换为 MB"""

        return round(obj.file_size / (1024 * 1024), 2)





class ImagingFileUploadSerializer(serializers.ModelSerializer):

    """影像文件上传序列化器"""

    

    class Meta:

        model = ImagingFile

        fields = ['patient', 'file_name', 'file_path', 'series_name']

    

    def validate_file_path(self, value):

        """验证文件"""

        # 限制文件大小（例如 100MB）

        if value.size > 100 * 1024 * 1024:

            raise serializers.ValidationError("文件大小不能超过 100MB")

        return value

    

    def create(self, validated_data):

        """创建影像文件记录，同患者同文件名自动替换旧记录"""

        file_obj = validated_data['file_path']

        validated_data['file_size'] = file_obj.size

        # 去重：删除同患者同文件名的旧记录
        ImagingFile.objects.filter(
            patient=validated_data['patient'],
            file_name=validated_data.get('file_name', ''),
        ).delete()

        return super().create(validated_data)

