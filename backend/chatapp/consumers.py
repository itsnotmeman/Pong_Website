import json
from channels.generic.websocket import AsyncWebsocketConsumer
from datetime import datetime
from redis.asyncio import Redis
from channels.db import database_sync_to_async
from users.models import User
from asgiref.sync import sync_to_async
from users.models import BlockedUser

@sync_to_async
def is_blocked(sender_id, recipient_id):
    return BlockedUser.objects.filter(blocker_id=recipient_id, blocked_id=sender_id).exists()

class ChatConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.username = None
        self.user_id = None

    async def connect(self):
        if self.scope.get("user").is_authenticated:
            self.user = self.scope["user"]

            await self.accept()

            self.user_id = str(self.user.id)
            self.username = self.user.name
            self.alias = self.user.alias

            await self.channel_layer.group_add("global_chat", self.channel_name)
            await self.channel_layer.group_add(f"user_{self.user_id}", self.channel_name)
        
            await self.load_and_send_message_history()
        
        else:
            await self.close()


    async def load_and_send_message_history(self):
        redis = Redis(host='redis', port=6379, decode_responses=True)

        all_messages = []

        # Fetch global messages
        global_messages = await redis.lrange('chat_history:global', 0, -1)
        for msg_json in global_messages:
            message = json.loads(msg_json)
            all_messages.append((message, 'global'))

        # Fetch private messages
        user_patterns = [f"chat_history:{self.username}_*", f"chat_history:*_{self.username}"]
        for pattern in user_patterns:
            keys = await redis.keys(pattern)
            for key in keys:
                messages = await redis.lrange(key, 0, -1)
                for msg_json in messages:
                    message = json.loads(msg_json)
                    all_messages.append((message, key))

        sorted_messages = sorted(all_messages, key=lambda x: x[0]["timestamp"])

        # Send sorted messages and invitations
        for message, key in sorted_messages:
            # Determine message type (chat_message or game_invitation)
            msg_type = 'chat_message' if 'chat_history' in key else 'game_invitation'
            await self.send(text_data=json.dumps({
                'type': msg_type,
                'sender_alias': message.get('sender_alias', 'Unknown'),
                'recipient_alias': message.get('recipient_alias', 'All'),
                'message': message['message'],
                'timestamp': message['timestamp'],
            }))

        await redis.close()

    async def disconnect(self, close_code):
        if self.scope.get("user").is_authenticated:
            if self.user_id is not None:
                await self.channel_layer.group_discard("global_chat", self.channel_name)
                await self.channel_layer.group_discard(f"user_{self.user_id}", self.channel_name)

    @database_sync_to_async
    def get_user_details_by_id(self, user_id):
        try:
            user = User.objects.get(id=user_id)
            return user.name, user.alias
        except User.DoesNotExist:
            return None, None

    async def store_and_send_message(self, message, sender_id, recipient_id=None):
        redis = Redis(host='redis', port=6379, decode_responses=True)
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        sender_username, sender_alias = await self.get_user_details_by_id(sender_id)

        # Prepare the message data
        serialized_message = json.dumps({
            'sender_alias': sender_alias if sender_alias else "Unknown",
            'message': message,
            'timestamp': timestamp,
            'recipient_alias': 'global'
        })

        # Prepare the message payload for sending
        message_payload = {
            "type": "chat_message",
            "message": message,
            "timestamp": timestamp,
            "sender_alias": sender_alias if sender_alias else "Unknown",
            "recipient_alias": 'global',
        }

        if recipient_id:
            recipient_username, recipient_alias = await self.get_user_details_by_id(recipient_id)
            if recipient_alias:
                serialized_message = json.dumps({
                    'sender_alias': sender_alias,
                    'message': message,
                    'timestamp': timestamp,
                    'recipient_alias': recipient_alias
                })
                message_payload["recipient_alias"] = recipient_alias
            
            if not await is_blocked(sender_id, recipient_id):
                # If not blocked, update the conversation key for storing the message
                conversation_key = f"chat_history:{sender_username}_{recipient_username}"
                await redis.rpush(conversation_key, serialized_message)

                # Define the group name for the recipient based on their user ID (for private messages)
                recipient_group_name = f"user_{recipient_id}"
                await self.channel_layer.group_send(recipient_group_name, message_payload)
            else:
                #print(f"Message from {sender_id} to {recipient_id} blocked.")
                pass
        else:
            # For global messages, use a generic conversation key
            conversation_key = 'chat_history:global'
            await redis.rpush(conversation_key, serialized_message)

        # Echo back the message to the sender in all cases
        sender_group_name = f"user_{sender_id}"
        await self.channel_layer.group_send(sender_group_name, message_payload)

        await redis.close()


    async def broadcast_user_activity(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        await self.channel_layer.group_send(
            "global_chat",
            {
                "type": "service_message",
                "message": message,
                "timestamp": timestamp
            }
        )

    async def service_message(self, event):
        # Extract message and timestamp from the event
        message = event['message']
        timestamp = event['timestamp']
        game_id = event['game_id']

        # Send service message to WebSocket with timestamp
        await self.send(text_data=json.dumps({
            'type': 'service_message',
            'message': message,
            'timestamp': timestamp,
            'game_id': game_id
        }))

    async def request_user_list(self, event):
        # Send the user list directly to the requesting client
        await self.update_user_list()

    @database_sync_to_async
    def get_all_users(self):
        # Fetches all users from the database, returning their ID and alias for the dropdown
        users = list(User.objects.values('id', 'alias'))
        # print("Fetched users:", users)
        return users

    async def update_user_list(self):
        # Fetch all users
        users = await self.get_all_users()
        # Send the user list to the client
        await self.send(text_data=json.dumps({
            'type': 'user_list_update',
            'users': users
        }))

    async def user_list_update(self, event):
        """
        Handle updates to the user list.
        """
        # Extract the user list from the event
        user_list = event['users']

        # Send the updated user list to the WebSocket
        await self.send(text_data=json.dumps({
            'type': 'user_list_update',
            'users': user_list
        }))

    async def broadcast_user_list(self, event):
        users = await self.get_all_users()
        await self.channel_layer.group_send(
            "global_chat",
            {
                "type": "user_list_update",
                "users": users,
            }
        )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')

        if message_type == 'request_user_list':
            await self.update_user_list()
        elif message_type == 'game_invitation':
            to_user = text_data_json.get('to_user')
            message = text_data_json.get('message', 'You have been invited to a game of Pong !')
            if to_user:
                await self.send_game_invitation(message, self.user_id, to_user)
            else:
                #print("No recipient specified for this game invitation.")
                pass
        else:
            message = text_data_json['message']
            to_user = text_data_json.get('to_user')  # Handle private messages
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            if to_user:
                await self.store_and_send_message(message, self.user_id, to_user)
            else:
                await self.store_and_send_message(message, self.user_id)

    async def chat_message(self, event):
        sender_channel_name = event.get('sender_channel_name')

        # Extracting the username, message, timestamp, and aliases from the event
        message = event['message']
        timestamp = event['timestamp']
        sender_alias = event.get('sender_alias', 'Unknown')
        recipient_alias = event.get('recipient_alias', 'Global')

       # Send message to WebSocket with all available data fields
        await self.send(text_data=json.dumps({
        'type': 'chat_message',
        'sender_alias': sender_alias,
        'recipient_alias': recipient_alias,
        'message': message,
        'timestamp': timestamp
        }))

    async def broadcast_game_update(self, game_data):
        """
        Send a message to all connected users with the updated game information.
        """
        await self.channel_layer.group_send(
            "global_chat",
            {
                "type": "game_update",
                "game_data": game_data,
            }
        )

    async def game_update(self, event):
        # Extract the game data from the event
        game_data = event['game_data']

        # Send the game data to the WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game.update',
            'game_data': game_data,
        }))

    async def game_updateTour(self, event):
        
        # Send the game data to the WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_update',
        }))

    async def send_game_invitation(self, message, sender_id, recipient_id):
        if await is_blocked(sender_id, recipient_id):
            return
        
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        sender_username, sender_alias = await self.get_user_details_by_id(sender_id)
        recipient_username, recipient_alias = await self.get_user_details_by_id(recipient_id)

        if not sender_alias:
            sender_alias = "Unknown"

        # Construct the invitation message
        serialized_invitation = json.dumps({
            'type': 'game_invitation',
            'sender_alias': sender_alias,
            'sender_id': sender_id,
            'recipient_alias': recipient_alias if recipient_alias else 'global',
            'recipient_id': recipient_id,
            'message': message,
            'timestamp': timestamp,
            'accepted': 'wait'
        })

        # Send the invitation directly to the recipient's group
        recipient_group_name = f"user_{recipient_id}"
        await self.channel_layer.group_send(recipient_group_name, {
            "type": "game_invitation_message",
            "message": serialized_invitation
        })

    async def game_invitation_message(self, event):
        # The invitation message is already serialized, just forward it to the WebSocket
        await self.send(text_data=event['message'])

    async def game_notif(self, event):
        message = event['message']
        timestamp = event['timestamp']
        # print("message to socket: ")
        # print(message)
        
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'game_notif',
            'message': message,
            'timestamp': timestamp,
        }))
        