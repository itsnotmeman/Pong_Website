# gameapp/consumers.py

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.db import transaction
from channels.layers import get_channel_layer
from gameapp.game_objects import (CANVAS_WIDTH, CANVAS_HEIGHT, PADDLES_WIDTH,
                                  PADDLES_HEIGHT, BALL_RADIUS, WIN_CONDITION)
from django.contrib.auth import get_user_model

channel_layer = get_channel_layer()
User = get_user_model()


class PlayerConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        if self.scope.get("user").is_authenticated:
            self.player = str(self.scope.get("user").id)
            self.player_group = self.player + "_game"
            await self.channel_layer.group_add(self.player_group, self.channel_name)
            await self.accept()
            await self.send(text_data=json.dumps({
                'type': 'gameInit',
                'canvas_width': CANVAS_WIDTH,
                'canvas_height': CANVAS_HEIGHT,
                'paddles_width': PADDLES_WIDTH,
                'paddles_height': PADDLES_HEIGHT,
                'ball_radius': BALL_RADIUS,
                'win_condition': WIN_CONDITION,
            }))
            await self.login()

            await channel_layer.send(
                "game_engine",
                {
                    "type": "gameapp.reconnect_to_game",
                    "player": self.player,
                }
            )

        else:
            await self.close()

    async def disconnect(self, close_code):
        if self.scope.get("user").is_authenticated:
            await self.channel_layer.group_discard(self.player_group, self.channel_name)

            await self.logout()

    
    @database_sync_to_async
    def login(self):
        with transaction.atomic():
            user = User.objects.select_for_update().get(id=self.player)
            if user.status == "offline":
                user.status = "online"
                user.save()
            elif user.status == "playing_offline":
                user.status = "playing_online"
                user.save()


    @database_sync_to_async
    def logout(self):
        with transaction.atomic():
            user = User.objects.select_for_update().get(id=self.player)
            if user.status == "online":
                user.status = "offline"
                user.save()
            elif user.status == "playing_online":
                user.status = "playing_offline"
                user.save()


    async def receive(self, text_data):

        await channel_layer.send(
            "game_engine",
            {
                "type": "gameapp.update_paddle",
                "player": self.player,
                'dir': text_data,
            }
        )

    async def gameapp_game_status(self, event):
        # Abbrevations:
        # lp: Left paddle position.
        # rp: Right paddle position.
        # bp: Ball position.
        # sc: Score.
        # p1: Alias of player 1.
        # p2: Alias of player 2.
        # won: Alias of the player who won. Empty while still playing.
        await self.send(text_data=json.dumps({
            'type': 'status',
            'lp': event["lp"],
            'rp': event["rp"],
            'bp': event["bp"],
            'sc': event["sc"],
            'p1': event["p1"],
            'p2': event["p2"],
            'won': event["won"]
        }))

    async def gameapp_game_countdown(self, event):
        
        await self.send(text_data=json.dumps({
            'type': 'countdown',
            'count': event['count'],
            'p1': event['p1'],
            'p2': event['p2']
        }))

    async def gameapp_add_game(self, event):
        await self.channel_layer.group_add(event["group_name"], self.channel_name)

    async def gameapp_remove_game(self, event):
        await self.channel_layer.group_discard(event["group_name"], self.channel_name)
        