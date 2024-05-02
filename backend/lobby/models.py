from django.db import models
from django.contrib.auth import get_user_model
from django.db.models.signals import post_save
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from datetime import datetime, timezone

class Game(models.Model):
    GAME_CHOICES = [
        ('Lobby', 'Lobby'),
        ('Tournament', 'Tournament'),
    ]

    STATE_CHOICES = [
        ('waiting', 'Waiting for Players'),
        ('ready', 'Ready'),
        ('in_progress', 'In Progress'),
        ('finished', 'Finished'),
    ]

    name = models.CharField(max_length=100, unique=False, blank=False, null=False)
    game_type = models.CharField(max_length=20, choices=GAME_CHOICES)
    state = models.CharField(max_length=20, choices=STATE_CHOICES, default='waiting')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    creator = models.ForeignKey(get_user_model(), on_delete=models.CASCADE, related_name='created_games')
    password = models.CharField(max_length=50, blank=True, null=True)
    max_players = models.PositiveIntegerField(default=2)
    player1 = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, related_name='game_player1')
    player2 = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, related_name='game_player2')
    player1_score = models.IntegerField(blank=True, null=True)
    player2_score = models.IntegerField(blank=True, null=True)
    
    winner = models.ForeignKey(get_user_model(), related_name='l_match_winner', on_delete=models.DO_NOTHING, blank=True, null=True)
    tour = models.ForeignKey('Tournament', related_name='l_tour', on_delete=models.DO_NOTHING, null=True, blank=True)
    round = models.ForeignKey('Round', related_name='l_round', on_delete=models.DO_NOTHING, null=True, blank=True)
   
    def save(self, *args, **kwargs):
        if not self.pk:
            original_name = self.name
            counter = 1

            while Game.objects.filter(name=self.name).exists():
                counter += 1
                self.name = f"{original_name}({counter})"

        super(Game, self).save(*args, **kwargs)

    @property
    def elapsed_time(self):
        if self.start_time and self.state == 'in_progress':
            return (datetime.now(timezone.utc) - self.start_time).total_seconds()
        return 0

    def add_player(self, player):
        if not self.player1:
            self.player1 = player
        elif not self.player2:
            self.player2 = player
        else:
            raise ValueError("Game is full")
        self.save()

    def remove_player(self, player):
        if self.player1 == player:
            self.player1 = None
        elif self.player2 == player:
            self.player2 = None
        else:
            pass
        self.save()

    def __str__(self):
        return self.name


#@receiver(post_save, sender=Game)
def broadcast_game_creation(sender, instance, created, **kwargs):
    if created and instance.player1 and instance.player2:
        timestamp = datetime.now().strftime("%H:%M:%S")
        creator_alias = instance.creator.alias
        game_name = instance.name
        game_id = instance.id
        message1 = f"{creator_alias} has accepted your invitation and created a new game '{game_name}' id '{game_id}'"
        message2 = f"{creator_alias} has created a new game '{game_name}' id {game_id}'"

        channel_layer = get_channel_layer()

        # Player1 and Player2 user ID channel group names
        player1_group_name = f"user_{instance.player1.id}" if instance.player1 else None
        player2_group_name = f"user_{instance.player2.id}" if instance.player2 else None

        # Send message to player1 if they exist
        if player1_group_name:
            async_to_sync(channel_layer.group_send)(
                player1_group_name,
                {
                    "type": "service_message",
                    "message": message1,
                    "timestamp": timestamp,
                    "game_id": game_id
                }
            )

        """
        # Send message to player2 if they exist
        if player2_group_name:
            async_to_sync(channel_layer.group_send)(
                player2_group_name,
                {
                    "type": "service_message",
                    "message": message2,
                    "timestamp": timestamp,
                    "game_id": game_id
                }
            )
        """
        
class Round(models.Model):
    name = models.CharField(max_length=15, unique = True)
    short_name = models.CharField(max_length=4, unique = True)
    level = models.IntegerField()
    player = models.IntegerField()

    class Meta:
        managed=False

    def __str__(self):
        return self.name
    
class Tournament(models.Model):
    STATUS_CHOICES = [
        ('waiting', 'Waiting for Players'),
        ('ready', 'Ready'),
        ('in_progress', 'In Progress'),
        ('finished', 'Finished'),
    ]

    NBPLAYER_CHOICES = [
        (4,'4'),
        (8, '8'),
        (16, '16'), 
    ]

    tour_id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=40, unique=True)
    org_id = models.ForeignKey(get_user_model(), related_name='l_tours', on_delete=models.DO_NOTHING)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    nb_player = models.IntegerField(choices=NBPLAYER_CHOICES, default=4)
    winner = models.ForeignKey(get_user_model(), related_name='l_tour_winner', blank=True, null=True, on_delete=models.DO_NOTHING)
    date_created = models.DateTimeField(default=datetime.now)

    def __str__(self):
        return self.name
    
class TournamentPlayer(models.Model):
     tournament = models.ForeignKey('Tournament', related_name='l_players', on_delete=models.DO_NOTHING, null=True)
     player = models.ForeignKey(get_user_model(), related_name='l_tour_players', on_delete=models.DO_NOTHING)

     class Meta:
        unique_together = (('tournament', 'player'),)

     def __str__(self):
        return f'{self.tournament} / {self.player}'
