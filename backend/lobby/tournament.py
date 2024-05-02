import random
import math
from datetime import datetime, timezone
from .serializers import GameSerializer, TournamentSerializer, GameTournamentSerializer
from .models import Round, Tournament, Game
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

channel_layer = get_channel_layer()

def  createTourGames(players):
    regPlayer = len(players)
    if regPlayer > 0:
        tournament = Tournament.objects.values_list('nb_player', 'name', 'org_id').get(tour_id=players[0][1])
        nb_player, tourName, creator = tournament
        # print("tournament", tournament[0], " // " ,tournament[1])
        # print("nb_player", nb_player, " // name" , tourName)
        level = Round.objects.values_list('level', flat=True).get(player=nb_player)
        rounds = Round.objects.values_list('short_name', flat=True) 
        # print("nb players ", nb_player, "- level ", level, "Regplayer: ", regPlayer)
        # print("rounds : ", rounds[level - 1])
        random.shuffle(players)
        # print(players)
        nbRound = regPlayer // 2
        # print("nbRound avant while ", nbRound)
        num = 1
        while nbRound > 0:
            insertGame = {}
            # print("nbRound avant if ", nbRound)
            if nbRound == regPlayer // 2:
                for i in range(0, regPlayer, 2):
                    # print(players[i][0]) # OK affiche le 1er element
                    gameName = tourName + " " + rounds[level - 1] + " " + str(num)
                    insertGame['name'] = gameName
                    insertGame['game_type'] = 'Tournament'
                    insertGame['state'] = 'ready'
                    insertGame['creator'] = creator
                    insertGame['player1'] = players[i][2]
                    insertGame['player2'] = players[i + 1][2]
                    insertGame['tour'] = players[0][1]
                    insertGame['round'] = level
                    serializer = GameTournamentSerializer(data=insertGame)
                    # print("SERIALIZED", insertGame)
                    if serializer.is_valid():
                        serializer.save()
                        num += 1

                        channel_layer = get_channel_layer()
                        message = f"You are expected to play in game {gameName}"
                        timestamp = datetime.now().strftime("%H:%M:%S")

                        # Player1 and Player2 user ID channel group names
                        player1_group_name = f"user_{players[i][2]}"
                        player2_group_name = f"user_{players[i + 1][2]}"

                        # Send message to player1 if they exist
                        if player1_group_name:
                            async_to_sync(channel_layer.group_send)(
                                player1_group_name,
                                {
                                    "type": "game_notif",
                                    "message": message,
                                    "timestamp": timestamp
                                }
                            )
                        if player2_group_name:
                            async_to_sync(channel_layer.group_send)(
                                player2_group_name,
                                {
                                    "type": "game_notif",
                                    "message": message,
                                    "timestamp": timestamp
                                }
                            )

                    else:
                        return "Failed to create first round"
            else:
                # print("else: nbRound: ", nbRound)
                insertGame = {}
                num = 1
                for i in range(0, nbRound):
                    # print("i = ", i)
                    roundNum = tourName + ' ' + rounds[level - 1]
                    if level > 1 :
                        roundNum += ' ' + str(num)
                    insertGame['name'] = roundNum
                    insertGame['game_type'] = 'Tournament'
                    insertGame['state'] = 'waiting'
                    insertGame['creator'] = creator
                    insertGame['tour'] = players[0][1]
                    insertGame['round'] = level
                    serializer = GameTournamentSerializer(data=insertGame)
                    if serializer.is_valid():
                        # print("SERIALIZED", insertGame)
                        serializer.save()
                        num += 1
                        # broadcast_game_creation(insertGame)
                    else:
                        return "Failed to create other rounds"
            nbRound = nbRound // 2
            # print("nbRound fin while, recalc ", nbRound)
            level -= 1
      
        async_to_sync(channel_layer.group_send)(
            "global_chat",
            {
                "type": "game_updateTour",
            }
        )
        try:
            tour = Tournament.objects.get(tour_id = players[0][1])
        except Tournament.DoesNotExist:
            return "Failed to update tournament status"
        updateStatus = {}
        updateStatus['status'] = 'ready'
        serializer = TournamentSerializer(tour, data=updateStatus, partial=True)
        # print(serializer)
        if serializer.is_valid():
            serializer.save()
            # print("status updated")
        else:  
                # print("NOT valide serializer")
                return "Failed to manage the next round"
            
        return "Tournament created"
    return "Failed to create Tournament"


def handleTourQualification(gameTour):
    # print("Depuis handle gameTour.tour: " ,  gameTour['tour'], " - ", gameTour['round'], " winner: ", gameTour['winner'])
    insertQualif = {}
    if gameTour['round'] != 1:
        allGameTour = list(Game.objects.values_list('id', flat=True).filter(tour_id=gameTour['tour']).order_by('id'))
        # print("all tours: ", allGameTour)
        # print("Index du game ", allGameTour.index(gameTour['id']))
        index_curr = allGameTour.index(gameTour['id'])
        index_next = int(((len(allGameTour) + 1)/2) + ((math.floor((0.5 + index_curr)/2))))

        try:
            game = Game.objects.get(id=allGameTour[index_next])
        except Game.DoesNotExist:
            return "Failed to find the next round"
        # print("next :", index_next, "id= ", allGameTour[index_next], "MATCH: ", game)
        if index_curr % 2 == 0:
            print("index est pair")
            insertQualif['player1'] = gameTour['winner']
            player1 = gameTour['winner']
            player2 = None
            print('insertQualif', insertQualif)
        else:
            print("index est impair")
            insertQualif['player2'] = gameTour['winner']
            player2 = gameTour['winner']
            player1 = None
            print('insertQualif', insertQualif)

        checkPlayer1 = (game.player1 is not None or 'player1' in insertQualif)
        checkPlayer2 = (game.player2 is not None or 'player2' in insertQualif)
        print("001: checkPlayer1:", checkPlayer1)
        print("002: checkPlayer2:", checkPlayer2)
        if checkPlayer1 and checkPlayer2:
            insertQualif['state'] = 'ready'
            message = f"You are expected to play in game {game.name}"
            timestamp = datetime.now().strftime("%H:%M:%S")

            # Player1 and Player2 user ID channel group names
            print("Player 1:", player1)
            print("Player 2:", player2)
            if player1:
                player1_group_name = f"user_{player1}"
            else:
                player1_group_name = f"user_{game.player1}"

            if player2:
                player2_group_name = f"user_{player2}"
            else:
                player2_group_name = f"user_{game.player2}"

            # Send message to player1 if they exist
            channel_layer = get_channel_layer()
            if player1_group_name:
                async_to_sync(channel_layer.group_send)(
                    player1_group_name,
                    {
                        "type": "game_notif",
                        "message": message,
                        "timestamp": timestamp
                    }
                )
            if player2_group_name:
                async_to_sync(channel_layer.group_send)(
                    player2_group_name,
                    {
                        "type": "game_notif",
                        "message": message,
                        "timestamp": timestamp
                    }
                )

            
        # insertQualif = {'player1': gameTour['winner']}
        serializer = GameTournamentSerializer(game, data=insertQualif, partial=True)
        # print(serializer)
        if serializer.is_valid():
            serializer.save()
            # broadcast_game_creation(game)
            
        else:
            return "Failed to manage the next round"
        return "Qualification managed"
    else:
        # print("Final")
        try:
            tour = Tournament.objects.get(tour_id = gameTour['tour'])
        except Tournament.DoesNotExist:
            return "Failed to find the next round"
        insertQualif['status'] = 'finished'
        insertQualif['winner'] = gameTour['winner']
        serializer = TournamentSerializer(tour, data=insertQualif, partial=True)
        # print(serializer)
        if serializer.is_valid():
            serializer.save()
        else:
            return "Failed to manage the next round"
        

def insertResultGame(id ,score1, score2):
    game = Game.objects.get(id=id)
    game.player1_score = score1
    game.player2_score = score2
    game.state = 'finished'
    game.end_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    if (score1 > score2):
        game.winner = game.player1
    else:
        game.winner = game.player2
    game.save()
    
    if game.tour is not None:
        gameTour = Game.objects.values('round', 'tour', 'winner', 'id').get(id=id)
        handleTourQualification(gameTour)        
  
    # Broadcast game data to clients to update games table.
    async_to_sync(channel_layer.group_send)(
        "global_chat",
        {
            "type": "game_updateTour",
        }
    )