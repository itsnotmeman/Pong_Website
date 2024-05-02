import os
import django
from channels.routing import ProtocolTypeRouter, URLRouter, ChannelNameRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'transcendence.settings')
django.setup()  # This ensures Django is fully loaded before proceeding

# Now we can safely import the ASGI application components that depend on Django
from django.core.asgi import get_asgi_application
from chatapp.consumers import ChatConsumer
from lobby.consumers import LobbyGameConsumer  # Import the GameConsumer from the lobby app
from gameapp.consumers import PlayerConsumer
from apiauth.consumers import ServerSentEventsConsumer
from gameapp.game_consumer import GameConsumer

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AuthMiddlewareStack(
        URLRouter([
            path('ws/lobby/', LobbyGameConsumer.as_asgi()),
            path('ws/chat/', ChatConsumer.as_asgi()),
            path('ws/game/', PlayerConsumer.as_asgi()),
            path('ws/onlineCheck/', ServerSentEventsConsumer.as_asgi()),
        ])
    ),
    "channel": ChannelNameRouter({
        "game_engine": GameConsumer.as_asgi()
    }),
})
