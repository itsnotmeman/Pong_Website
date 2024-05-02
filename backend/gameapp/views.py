# gameapp/views.py

from lobby.models import Game
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.http import JsonResponse
from django.db import transaction
from django.contrib.auth import get_user_model
from datetime import datetime
from django.contrib.auth.decorators import login_required
import redis
from django.views.decorators.http import require_POST
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view
from lobby.serializers import GameSerializer

channel_layer = get_channel_layer()
User = get_user_model()

@login_required
def get_game_status(request):

    request_player = request.user.id

    redis_game_status = redis.Redis(host='redis', port=6379, decode_responses=True)
    game_status = redis_game_status.hgetall(str(request_player) + ':game_status')

    if not game_status:
        return JsonResponse({'error': 'The match hasn\'t started yet.'}, status=400)
    
    return JsonResponse(game_status)

@require_POST
@login_required
def move_paddle(request):

    request_player = request.user.id

    redis_game_status = redis.Redis(host='redis', port=6379, decode_responses=True)
    game_status = redis_game_status.hgetall(str(request_player) + ':game_status')

    if not game_status:
        return JsonResponse({'error': 'The match hasn\'t started yet.'}, status=400)
    
    # Reverse input because frontend is in reverse order.
    dir = request.POST.get("dir")
    if dir == "up":
        dir = "down"
    elif dir == "down":
        dir = "up"
    elif dir == "up2":
        dir = "down2"
    elif dir == "down2":
        dir = "up2"

    async_to_sync(channel_layer.send)(
        "game_engine",
        {
            "type": "gameapp.update_paddle",
            "player": str(request_player),
            'dir': dir,
        }
    )
    
    return JsonResponse(game_status)

@api_view(['POST'])
@login_required
def start_game(request, game_id):
    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    player1 = game.player1.id
    player2 = game.player2.id
    alias_player1 = game.player1.alias
    alias_player2 = game.player2.alias

    request_player = request.user.id
    if (request_player != player1 and request_player != player2):
        return JsonResponse({'error': 'Only participants can start the game.'}, status=400)

    with transaction.atomic():
        gameState = Game.objects.select_for_update().get(id=game_id)
        if gameState.state == "ready":
            gameState.state = "in_progress"
            gameState.save()

            # Broadcast game data to clients to update games table
            game_data = GameSerializer(gameState).data

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                "game_list",
                {
                    "type": "game_update",
                    "game_data": game_data,
                }
            )
        else:
            return JsonResponse({'error': 'Game already started or finished or not available.'}, status=400)

        user = User.objects.select_for_update().get(id=player1)
        user2 = User.objects.select_for_update().get(id=player2)
        if user.status == "online" and user2.status == "online":

            user.status = "playing_online"
            user.save()

            user2.status = "playing_online"
            user2.save()

            gameState.start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            gameState.save()

        else:
            gameState.state = "ready"
            gameState.save()
            return JsonResponse({'error': 'Player is already in a game or offline.'}, status=400)


    async_to_sync(channel_layer.send)(
        "game_engine",
        {
            "type": "gameapp.start_game",
            "game_id": str(game.id),
            "player1": str(player1),
            "player2": str(player2),
            "alias_player1": alias_player1,
            "alias_player2": alias_player2,
            "group_name": "game_" + str(game.id)
        }
    )

    # Send message to the players to redirect them to the game tab.
    async_to_sync(channel_layer.group_send)(
        str(player1),
        {
            "type": "apiauth.signal",
            "message": "redirect_to_game",
        }
    )
    async_to_sync(channel_layer.group_send)(
        str(player2),
        {
            "type": "apiauth.signal",
            "message": "redirect_to_game",
        }
    )

    # Send message to add the players to the group for this game.
    async_to_sync(channel_layer.group_send)(
        str(player1) + "_game",
        {
            "type": "gameapp.add_game",
            "group_name": "game_" + str(game.id),
        }
    )
    async_to_sync(channel_layer.group_send)(
        str(player2) + "_game",
        {
            "type": "gameapp.add_game",
            "group_name": "game_" + str(game.id),
        }
    )

    response = JsonResponse({'status': 'game started'})
    return response

@login_required
def start_local_game(request):
    
    player = request.user.id
    alias_player = request.user.alias

    with transaction.atomic():
        user = User.objects.select_for_update().get(id=player)

        if user.status == "online":
            user.status = "playing_online"
            user.save()
        else:
            return JsonResponse({'error': 'Player is already in a game.'}, status=400)

    async_to_sync(channel_layer.send)(
        "game_engine",
        {
            "type": "gameapp.start_local_game",
            "player": str(player),
            "alias_player": alias_player,
            "group_name": "game_" + str(player),
        }
    )

    # Send message to add the player to the group for this game.
    async_to_sync(channel_layer.group_send)(
        str(player) + "_game",
        {
            "type": "gameapp.add_game",
            "group_name": "game_" + str(player),
        }
    )
    
    response = JsonResponse({'status': 'game started'})
    return response

