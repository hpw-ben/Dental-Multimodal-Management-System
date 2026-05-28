from django.apps import AppConfig


class ImagingConfig(AppConfig):
    name = 'imaging'
    
    def ready(self):
        import imaging.signals  # 注册信号
