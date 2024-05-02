# gameapp/game_objects.py

import math
import random
import asyncio
import threading
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from lobby.models import Game
from django.db import transaction
from time import sleep
from django.contrib.auth import get_user_model
import datetime
from lobby.tournament import insertResultGame
import redis

User = get_user_model()
channel_layer = get_channel_layer()

CANVAS_WIDTH = 800
CANVAS_HEIGHT = 600
PADDLES_WIDTH = 10
PADDLES_HEIGHT = 80
PADDLES_SPEED = 16
BALL_RADIUS = 6
BALL_SPEED = 10
WIN_CONDITION = 5
FPS = 1/30
COUNTDOWN_SECONDS = 5
DELAY_AFTER_GOAL = 4
Y_SPEED_MULTIPLICATOR = 3

class GameEngine(threading.Thread):
	def __init__(self, screen, ball, left_paddle, right_paddle, score,
				 player1, player2, alias_player1, alias_player2, game_id, group_name):
		super().__init__()  # Call the superclass's __init__ method
		self.screen = screen
		self.ball = ball
		self.left_paddle = left_paddle
		self.right_paddle = right_paddle
		self.score = score
		self.player1 = player1
		self.player2 = player2
		self.alias_player1 = alias_player1
		self.alias_player2 = alias_player2
		self.group_name = group_name
		self.game_id = game_id
		self.player_won = 0


	# -> None: means the function doesn't return anything.
	def run(self) -> None:
		
		# Store the game status in redis.
		redis_game_status = redis.Redis(host='redis', port=6379, decode_responses=True)

		# Countdown before the game starts.
		self.countdown()

		while True:

			start_time = datetime.datetime.now()

			self.left_paddle.move()
			self.right_paddle.move()
			self.ball.move(self.left_paddle, self.right_paddle)

			self.player_won = str(self.player_won)

			async_to_sync(channel_layer.group_send)(
				self.group_name,
				{
				"type": "gameapp.game_status",
				'bp' : (int(self.ball.x), int(self.ball.y)),
				'lp' : (self.left_paddle.x, self.left_paddle.y),
				'rp' : (self.right_paddle.x, self.right_paddle.y),
				'sc' : (self.score.score_player_1, self.score.score_player_2),
				'p1' : self.alias_player1,
				'p2' : self.alias_player2,
				'won' : self.player_won,
				}
			)

			# For CLI request.
			bp = ','.join((str(int(self.ball.x)), str(int(self.ball.y))))
			lp = ','.join((str(int(self.left_paddle.x)), str(int(self.left_paddle.y))))
			rp = ','.join((str(int(self.right_paddle.x)), str(int(self.right_paddle.y))))
			sc = ','.join((str(self.score.score_player_1), str(self.score.score_player_2)))
			redis_game_status.hset(self.player1 + ':game_status', mapping={
				'bp' : bp,
				'lp' : lp,
				'rp' : rp,
				'sc' : sc,
				'p1' : self.alias_player1,
				'p2' : self.alias_player2,
				'won' : self.player_won,
			})
			redis_game_status.hset(self.player2 + ':game_status', mapping={
				'bp' : bp,
				'lp' : lp,
				'rp' : rp,
				'sc' : sc,
				'p1' : self.alias_player1,
				'p2' : self.alias_player2,
				'won' : self.player_won,
			})

			self.player_won = self.score.score_reached()
			if self.player_won:

				# Python ternary operator.
				winner = self.alias_player1 if self.player_won == 1 else self.alias_player2
				
				async_to_sync(channel_layer.group_send)(
					self.group_name,
					{
					"type": "gameapp.game_status",
					'bp' : (int(self.ball.x), int(self.ball.y)),
					'lp' : (self.left_paddle.x, self.left_paddle.y),
					'rp' : (self.right_paddle.x, self.right_paddle.y),
					'sc' : (self.score.score_player_1, self.score.score_player_2),
					'p1' : self.alias_player1,
					'p2' : self.alias_player2,
					'won' : winner,
					}
				)
				async_to_sync(channel_layer.group_send)(
					self.group_name,
					{
						"type": "gameapp.remove_game",
						'group_name' : self.group_name,
					}
				)

				# For CLI request.
				bp = ','.join((str(int(self.ball.x)), str(int(self.ball.y))))
				lp = ','.join((str(int(self.left_paddle.x)), str(int(self.left_paddle.y))))
				rp = ','.join((str(int(self.right_paddle.x)), str(int(self.right_paddle.y))))
				sc = ','.join((str(self.score.score_player_1), str(self.score.score_player_2)))
				redis_game_status.hset(self.player1 + ':game_status', mapping={
					'bp' : bp,
					'lp' : lp,
					'rp' : rp,
					'sc' : sc,
					'p1' : self.alias_player1,
					'p2' : self.alias_player2,
					'won' : winner,
				})
				redis_game_status.hset(self.player2 + ':game_status', mapping={
					'bp' : bp,
					'lp' : lp,
					'rp' : rp,
					'sc' : sc,
					'p1' : self.alias_player1,
					'p2' : self.alias_player2,
					'won' : winner,
				})

				if self.game_id:
					insertResultGame(self.game_id, self.score.score_player_1, self.score.score_player_2)
					async_to_sync(channel_layer.group_send)(
					"global_chat",
					{
						"type": "game_updateTour",
					})

				self.update_users_status()

				async_to_sync(channel_layer.send)(
					"game_engine",
					{
						"type": "gameapp.game_finished",
						"player1": self.player1,
						"player2": self.player2,
					}
				)
				break

			# Adjust the sleep time so that the FPS are constant.
			end_time = datetime.datetime.now()
			delta = (end_time - start_time).total_seconds()  # Difference in seconds.
			if (delta < FPS):  # Only if the time elapsed isn't already longer than the FPS.
				sleep(FPS - delta)


	def	update_users_status(self):
		with transaction.atomic():
			p1 = User.objects.select_for_update().get(id=self.player1)
			if p1.status == "playing_offline":
				p1.status = "offline"
				p1.save()
			elif p1.status == "playing_online":
				p1.status = "online"
				p1.save()

			if self.player2 != "_guest":
				p2 = User.objects.select_for_update().get(id=self.player2)
				if (p2.status == "playing_offline"):
					p2.status = "offline"
					p2.save()
				elif p2.status == "playing_online":
					p2.status = "online"
					p2.save()

	def	countdown(self) -> None:

		for i in range(COUNTDOWN_SECONDS, 0, -1):

			async_to_sync(channel_layer.group_send)(
				self.group_name,
				{
				"type": "gameapp.game_countdown",
				'count' : i,
				'p1' : self.alias_player1,
				'p2' : self.alias_player2,
				}
			)
			sleep(1)

		# After for loop.
		async_to_sync(channel_layer.group_send)(
			self.group_name,
			{
				"type": "gameapp.game_countdown",
				'count' : 'start',
				'p1' : self.alias_player1,
				'p2' : self.alias_player2,
			}
		)
		sleep(0.5)


class Screen:
	def __init__(self, width, height):
		self.width = width
		self.height = height

	def get_width(self):
		return self.width

	def get_height(self):
		return self.height


class Ball:
	def __init__(self, screen, score):
		self.screen = screen
		self.screen_width = self.screen.get_width()
		self.screen_height = self.screen.get_height()
		self.score = score
		self.radius = BALL_RADIUS
		# // is a floor division.
		self.x = self.screen_width // 2
		self.y = self.screen_height // 2
		self.initialSpeedX = BALL_SPEED
		self.initialSpeedY = BALL_SPEED
		randomness = random.random()
		self.speed_x = self.initialSpeedX #* math.cos(0.25 * math.pi * randomness)
		self.speed_y = self.initialSpeedY * math.sin(0.25 * math.pi * randomness)
		if (random.random() <= 0.5):
			self.speed_x *= -1
		if (random.random() <= 0.5):
			self.speed_y *= -1

	def move(self, left_paddle, right_paddle):
		self.x += self.speed_x
		self.y += self.speed_y
		if (self.y + self.radius > self.screen_height) and self.speed_y > 0:
			self.speed_y *= -1
		elif (self.y - self.radius < 0) and self.speed_y < 0:
			self.speed_y *= -1
		self.ball_paddle_collision(left_paddle, right_paddle)
		self.scoring()

	def scoring(self):
		if (self.x < self.radius):
			self.score.update_score(2)
			self.reset()
		elif (self.x >= self.screen_width - self.radius):
			self.score.update_score(1)
			self.reset()

	def reset(self):
		self.x = self.screen_width // 2
		self.y = self.screen_height // 2

		# Start a new thread to sleep for 10 seconds
		sleep_thread = threading.Thread(target=self.delay)
		sleep_thread.start()

	def	delay(self):
		self.speed_x = 0
		self.speed_y = 0
		sleep(DELAY_AFTER_GOAL)

		# Random floating point number in the range 0.0 <= X < 1.0.
		randomness = random.random()
		# Multiply with 0.25 to have a max angle of 45°.
		self.speed_x = self.initialSpeedX #* math.cos(0.25 * math.pi * randomness)
		self.speed_y = self.initialSpeedY * math.sin(0.25 * math.pi * randomness)
		if self.score.last_scorer == 2:  # Or maybe if last_scorer == 1 ?
			self.speed_x *= -1
		if (random.random() <= 0.5):
			self.speed_y *= -1

	def ball_paddle_collision(self, left_paddle, right_paddle):
		if self.collide_with_left_paddle(left_paddle):
			# Calculate the relative position of the collision point on the paddle
			relative_intersect_y = (self.y - (left_paddle.y + left_paddle.height / 2)) / (left_paddle.height / 2)
			# Calculate the new speed_y based on the relative position
			self.speed_y = relative_intersect_y**3 * self.initialSpeedY * Y_SPEED_MULTIPLICATOR
			# self.speed_y = relative_intersect_y * self.initialSpeedY * Y_SPEED_MULTIPLICATOR
			# Reverse the direction of speed_x
			self.speed_x *= -1
		elif self.collide_with_right_paddle(right_paddle):
			# Calculate the relative position of the collision point on the paddle
			relative_intersect_y = (self.y - (right_paddle.y + right_paddle.height / 2)) / (right_paddle.height / 2)
			# Calculate the new speed_y based on the relative position
			self.speed_y = relative_intersect_y**3 * self.initialSpeedY * Y_SPEED_MULTIPLICATOR
			# self.speed_y = relative_intersect_y * self.initialSpeedY * Y_SPEED_MULTIPLICATOR
			# Reverse the direction of speed_x
			self.speed_x *= -1

	def collide_with_left_paddle(self, left_paddle):
		return (
			self.x - self.radius < left_paddle.x + left_paddle.width
			and left_paddle.y - self.radius < self.y < left_paddle.y + left_paddle.height + self.radius
		)

	def collide_with_right_paddle(self, right_paddle):
		return (
			self.x + self.radius > right_paddle.x
			and right_paddle.y - self.radius < self.y < right_paddle.y + right_paddle.height + self.radius
		)


class Paddle:
	def __init__(self, screen, horizontal_position):
		self.screen = screen
		self.horizontal_position = horizontal_position
		self.screen_height = self.screen.get_height()
		self.width = PADDLES_WIDTH
		self.height = PADDLES_HEIGHT
		self.paddle_speed = PADDLES_SPEED
		self.reset()
		self.direction = "stop"

	def move_up(self):
		self.y -= self.paddle_speed
		if self.y < 0:
			self.y = 0

	def move_down(self):
		self.y += self.paddle_speed
		if self.y + self.height > self.screen_height:
			self.y = self.screen_height - self.height

	def reset(self):
		self.x = self.horizontal_position
		self.y = (self.screen.get_height() - self.height) / 2

	def	move(self):
		if self.direction == "up":
			self.move_up()
		elif self.direction == "down":
			self.move_down()
		elif self.direction == "stop":
			# Don't move.
			pass


class Score:
	def __init__(self):
		self.score_player_1 = 0
		self.score_player_2 = 0
		self.last_scorer = 0
		self.winner = 0
		self.win_condition = WIN_CONDITION

	def update_score(self, player):
		if player == 1:
			self.score_player_1 += 1
			self.last_scorer = 1
		elif player == 2:
			self.score_player_2 += 1
			self.last_scorer = 2

	def	score_reached(self):
		if self.score_player_1 == self.win_condition:
			self.winner = 1
		elif self.score_player_2 == self.win_condition:
			self.winner = 2
		return (self.winner)
