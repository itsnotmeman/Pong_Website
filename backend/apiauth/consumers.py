# consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ServerSentEventsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope.get("user").is_authenticated:
            self.user = str(self.scope.get("user").id)
            await self.channel_layer.group_add(self.user, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.scope.get("user").is_authenticated:
            await self.channel_layer.group_discard(self.user, self.channel_name)
        
    # Receive message from group and send to WebSocket.
    async def apiauth_signal(self, event):
        # Send message to WebSocket.
        await self.send(text_data=json.dumps({
            'message': event['message']
        }))
