# signals.py

from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_out
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


@receiver(user_logged_out)
def user_logout_signal(sender, **kwargs):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        str(kwargs["user"].id),  # Users group id.
        {"type": "apiauth.signal",
        "message": "logout"},
    )
