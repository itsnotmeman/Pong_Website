# gameapp/game_consumer.py

from channels.consumer import SyncConsumer
from asgiref.sync import async_to_sync
from gameapp.game_objects import Screen, GameEngine, Ball, Paddle, Score
from gameapp.game_objects import (CANVAS_WIDTH, CANVAS_HEIGHT, PADDLES_WIDTH)


class   GameConsumer(SyncConsumer):

    def __init__(self, *args, **kwargs):
        self.game_id = ""
        self.player1 = ""
        self.player2 = ""
        self.alias_player1 = ""
        self.alias_player2 = ""
        self.paddles = {}  # Dictionary of all paddles.
        self.players = {}  # Dictionary of all players with their associated game.
        self.direction_mapping = {
            "up2": "up",
            "down2": "down",
            "stop2": "stop"
        }


    def gameapp_start_local_game(self, event):
        self.player1 = event["player"]
        self.player2 = "_guest"
        self.alias_player1 = event["alias_player"]
        self.alias_player2 = "Guest"
        self.game_id = ""
        group_name = event["group_name"]
        self.players[self.player1] = group_name

        screen = Screen(CANVAS_WIDTH, CANVAS_HEIGHT)
        score = Score()
        ball = Ball(screen, score)
        self.paddles[self.player1] = Paddle(screen, 0)  # Left paddle.
        self.paddles[self.player1 + "_guest"] = Paddle(screen, CANVAS_WIDTH - PADDLES_WIDTH)  # Right paddle.
        game = GameEngine(screen, ball, self.paddles[self.player1], self.paddles[self.player1 + "_guest"], score, 
                        self.player1, self.player2, self.alias_player1, self.alias_player2, self.game_id, group_name)
        game.start()


    def gameapp_start_game(self, event):
            
        self.game_id = event["game_id"]
        self.player1 = event["player1"]
        self.player2 = event["player2"]
        self.alias_player1 = event["alias_player1"]
        self.alias_player2 = event["alias_player2"]
        group_name = event["group_name"]
        self.players[self.player1] = group_name
        self.players[self.player2] = group_name

        screen = Screen(CANVAS_WIDTH, CANVAS_HEIGHT)
        score = Score()
        ball = Ball(screen, score)
        self.paddles[self.player1] = Paddle(screen, 0)  # Left paddle.
        self.paddles[self.player2] = Paddle(screen, CANVAS_WIDTH - PADDLES_WIDTH)  # Right paddle.
        game = GameEngine(screen, ball, self.paddles[self.player1], self.paddles[self.player2], score, 
                        self.player1, self.player2, self.alias_player1, self.alias_player2, self.game_id, group_name)
        game.start()


    def gameapp_update_paddle(self, event):

        if event["player"] + "_guest" in self.paddles:
            # This means it is a local game.
            if event["dir"] in self.direction_mapping:
                self.paddles[event["player"]].direction = self.direction_mapping[event["dir"]]
            else:
                self.paddles[event["player"] + "_guest"].direction = event["dir"]

        elif event["player"] in self.paddles:
            self.paddles[event["player"]].direction = event["dir"]


    def gameapp_game_finished(self, event):
        # Set return value of .pop() to None to prevent a "key error".
        self.paddles.pop(event["player1"], None)
        self.paddles.pop(event['player1'] + "_guest", None)  # For local games.
        self.paddles.pop(event["player2"], None)

        self.players.pop(event["player1"], None)
        self.players.pop(event["player2"], None)


    def gameapp_reconnect_to_game(self, event):

        if event["player"] in self.players:
            
            async_to_sync(self.channel_layer.group_send)(
                event["player"] + "_game",
                {
                    "type": "gameapp.add_game",
                    "group_name": self.players[event["player"]],
                }
            )
