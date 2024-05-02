from django.apps import AppConfig


class ApiauthConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apiauth'

    # For signals in signals.py.
    def ready(self):
        # Implicitly connect signal handlers decorated with @receiver.
        from . import signals
