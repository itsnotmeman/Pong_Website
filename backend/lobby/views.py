from django.db import IntegrityError
from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .tournament import createTourGames
from .models import Game, Tournament, Round, TournamentPlayer
from .serializers import GameSerializer, RoundSerializer, TournamentSerializer, GameTournamentSerializer
from .serializers import TournamentDisplaySerializer, TourUniqueSerializer, TournamentPlayerSerializer
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from rest_framework import status
from rest_framework.decorators import api_view
from django.views.decorators.http import require_POST
from .models import Game
import logging
import json
from django.contrib.auth import get_user_model
from datetime import datetime
from users.models import BlockedUser

logger = logging.getLogger('transcendence')

class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all().order_by('-id')
    serializer_class = GameSerializer

    def perform_create(self, serializer):
        try:
            game = serializer.save(creator=self.request.user, player1=self.request.user)
            self.broadcast_game_creation(game)

        except IntegrityError as e:
            return Response({'error': 'A game with that name already exists.'}, status=status.HTTP_400_BAD_BAD_REQUEST)

    def broadcast_game_creation(self, game):
        broadcast_game_creation(game)

    @action(detail=True, methods=['post'])
    def join(self, request, pk=None):
        if not request.user.is_authenticated:
            return JsonResponse({'isAuthenticated': "false"})
        game = self.get_object()
        if game.game_type == 'Tournament':
            return Response({'status': 'You cannot join a Tournament'})
        # Check and assign the user to the first available player slot
        if game.player1 is None:
            game.player1 = request.user
        elif game.player1 == request.user:
            return Response({'error': 'Player is already registered.'}, status=400)
        elif game.player2 is None:
            game.player2 = request.user
        else:
            return Response({'error': 'Game is full'}, status=400)
        
        if game.player1 is not None and game.player2 is not None:
            game.state = 'ready'

        game.save()
        
        # Notify clients of games list change
        self.broadcast_game_update(game)
      
        return Response({'status': 'joined game'})
    
    def broadcast_game_update(self, game):
        game_data = GameSerializer(game).data

        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            "game_list",
            {
                "type": "game_update",
                "game_data": game_data,
            }
        )

class UserAliasView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_authenticated:
            return JsonResponse({'isAuthenticated': "false"})
        return Response({"alias": request.user.alias if hasattr(request.user, 'alias') else ''})

#Game
@api_view(['GET', 'PUT', 'DELETE'])
def game_detail(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    try:
        game = Game.objects.get(id=id)
    except Game.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = GameTournamentSerializer(game)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = GameTournamentSerializer(game, data=request.data, partial=True)
        # print("Request.data : ", request.data)
        # print("Serializer: ", serializer)
        if serializer.is_valid():
            serializer.save()
            # print("ID : " , id)
            # tour_id = Game.objects.values_list('tour', flat=True).get(game_id=id)
            # print("tour id:" ,  tour_id)
            gameTour = Game.objects.values('round', 'tour', 'winner', 'id').get(id=id) 
           
            if gameTour['tour'] is not None: #Version production
            # if gameTour['tour'] is not None and gameTour['winner'] is not None:    # Version test
            #print(handleTourQualification(gameTour))
            #print("is Tour")
                return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        game.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
       

@api_view(['GET'])
def myGame_list(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    mygames = Game.objects.filter(game_player1=request.user).order_by('end_time') | Game.objects.filter(game_player2=request.user).order_by('end_time')
    print(mygames)
    serializer = GameSerializer(mygames, many=True)
    return JsonResponse(serializer, safe=False)


#Round
@api_view(['GET'])
def round_list(request):
     if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
     if request.method == 'GET':
        rounds = Round.objects.all()
        serializer = RoundSerializer(rounds, many=True)
        return JsonResponse(serializer.data, safe=False)
     
#Tournament
@login_required(redirect_field_name="", login_url="")
@api_view(['GET', 'POST'])
def tournament_list(request):
   
    if request.method == 'GET':
        tours = Tournament.objects.all().select_related().order_by('-tour_id')
        serializer = TournamentDisplaySerializer(tours, many=True)
        return JsonResponse(serializer.data, safe=False)
    elif request.method == 'POST':
            numPlayer = list(Round.objects.values_list('player', flat=True))
            if request.user.id == int(request.POST["org_id"]) and (int(request.POST['nb_player']) in numPlayer):
                serializer = TournamentSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return JsonResponse(serializer.data, status=status.HTTP_201_CREATED)
            return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def tour_unique(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    if request.method == 'GET':
        tours = Tournament.objects.all()
        serializer = TourUniqueSerializer(tours, many=True)
        return JsonResponse(serializer.data, safe=False )           

@api_view(['GET', 'PUT', 'DELETE'])
def tournament_detail(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    try:
        tour = Tournament.objects.get(tour_id=id)
    except Tournament.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = TournamentDisplaySerializer(tour)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = TournamentSerializer(tour, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        tour.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

#TournamentPlayer
@api_view(['GET', 'POST'])
def tournamentPlayer_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    if request.method == 'GET':
        tournamentPlayers = TournamentPlayer.objects.all()
        serializer = TournamentPlayerSerializer(tournamentPlayers, many=True)
        return JsonResponse(serializer.data, safe=False)
    elif request.method == 'POST':
            tour = request.POST['tournament']
            numbPlayer = Tournament.objects.values_list('nb_player', flat=True).get(tour_id=tour)
            regPlayer = TournamentPlayer.objects.filter(tournament=tour).count()
            if regPlayer < numbPlayer and request.user.id == int(request.POST["player"]):
                serializer = TournamentPlayerSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    feedback = "Registered"
                    regPlayer = TournamentPlayer.objects.filter(tournament=tour).count()
                    #print("nb_player Tour ", numbPlayer, "Registered 2 : ", regPlayer)
                    if regPlayer == numbPlayer:
                        try:
                            players = list(TournamentPlayer.objects.filter(tournament=tour).values_list('id','tournament', 'player'))
                        except Tournament.DoesNotExist:
                            return Response(status=status.HTTP_404_NOT_FOUND)
                        feedback += (", " +  createTourGames(players))
                    return JsonResponse(feedback, safe=False, status=status.HTTP_201_CREATED)
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            return Response("Not registered, tournament full", status=status.HTTP_400_BAD_REQUEST)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'DELETE'])
def tournamentPlayer_detail(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    try:
        player = TournamentPlayer.objects.get(id=id)
    except TournamentPlayer.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        serializer = TournamentPlayerSerializer(player)
        return Response(serializer.data)
    
    elif request.method == 'DELETE':
        statusTour = Tournament.objects.values_list('status', flat=True).get(name=player.tournament)

        if statusTour == "waiting":
            if request.user.id == int(player.player_id):
                player.delete()
                return Response(status=status.HTTP_204_NO_CONTENT)
    return Response("Bad request", status=status.HTTP_400_BAD_REQUEST)
   
#OneTournamentPlayer
@api_view(['GET'])
def oneTournamentPlayer_list(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    # print("Debut oneTournamentPlayer_list")
    tournamentPlayers = TournamentPlayer.objects.filter(tournament=id)

    # Players list
    if request.method == 'GET':
        serializer = TournamentPlayerSerializer(tournamentPlayers, many=True)
        return JsonResponse(serializer.data, safe=False)

#OneTournamentGame
@api_view(['GET'])
def oneTournamentGame_list(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    # print("Debut oneTournamentGame_list")
    tournamentGames = Game.objects.filter(tour=id).order_by('id')

    # Games list
    if request.method == 'GET':
        serializer = GameSerializer(tournamentGames, many=True)
        return JsonResponse(serializer.data, safe=False)
    
# Create game when accept invitation is clicked
@login_required(redirect_field_name="", login_url="")
@require_POST
def create_game_from_invitation(request):
    #print(request.body)
    try:
        data = json.loads(request.body)
        inviter_id = data.get('inviter_id')
        invitee_id = data.get('invitee_id')
        #print("inviter: " + inviter_id)
        #print("invitee: " + invitee_id)
        # Validate users
        User = get_user_model()
        try:
            inviter = User.objects.get(id=inviter_id)
            invitee = User.objects.get(id=invitee_id)
            #print(inviter)
            #print(invitee)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=400)

        # Create the game
        game_name = f"{inviter.alias} vs {invitee.alias}"
        game = Game.objects.create(
        name=game_name,
        game_type='Lobby',
        state='ready',
        creator=inviter,
        player1=inviter,
        player2=invitee
        )

        broadcast_game_creation(game)
        return JsonResponse({'status': 'success', 'game_id': game.id, 'message': 'Game created successfully'})

    except Exception as e:
        return JsonResponse({'error': 'Server error', 'details': str(e)}, status=400)

def broadcast_game_creation(game):
    game_data = GameSerializer(game).data
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        "global_chat",
        {
            "type": "game.update",
            "game_data": game_data,
        }
    )
    async_to_sync(channel_layer.group_send)(
        "game_list",
        {
            "type": "game_update",
            "game_data": game_data,
        }
    )
    

@login_required
def update_blocked_status(request):
    if request.method == 'POST':
        data = json.loads(request.body.decode('utf-8'))

        user_id = data.get('user_id')

        is_blocked = data.get('is_blocked', False)

        # print(is_blocked)

        # Retrieve the User instances based on the user IDs
        User = get_user_model()
        try:
            blocker = User.objects.get(id=request.user.id)
            blocked = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return JsonResponse({'error': 'One or both users not found'}, status=400)

        if is_blocked:
            # Block the user
            blocked_user_instance, created = BlockedUser.objects.get_or_create(blocker=blocker, blocked=blocked)
            #print(f"Blocked user instance: {blocked_user_instance}, Created new: {created}")
        else:
            # Unblock the user
            BlockedUser.objects.filter(blocker=blocker, blocked=blocked).delete()

        return JsonResponse({'success': True})

    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)

@login_required
def get_blocked_status(request):
    if request.method == 'GET':
        user_id = request.GET.get('user_id')
        #print(f"Received user ID: {user_id}")
        try:
            blocked_user = BlockedUser.objects.get(blocked_id=user_id)
            #print(blocked_user)
            #print('blocked')
            return JsonResponse({'is_blocked': True})
        except BlockedUser.DoesNotExist:
            #print('Not blocked')
            return JsonResponse({'is_blocked': False})
    else:
        return JsonResponse({'error': 'Method not allowed'}, status=405)
