import json
from channels.generic.websocket import AsyncWebsocketConsumer

class LobbyGameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope.get("user").is_authenticated:
            print("Lobby WebSocket connected:", self.channel_name)
            await self.accept()

            await self.channel_layer.group_add(
                "game_list",
                self.channel_name
            )
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.scope.get("user").is_authenticated:
            await self.channel_layer.group_discard(
                "game_list",
                self.channel_name
            )

    async def game_update(self, event):
        await self.send(text_data=json.dumps(event))
        print("game_update lobby consumers.py l 26")

    async def game_notif(self, event):
        message = event['message']
        timestamp = event['timestamp']
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_notif',
            'message': message,
            'timestamp': timestamp,
        }))

