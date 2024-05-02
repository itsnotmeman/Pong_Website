from django.contrib.auth import get_user_model
from rest_framework import serializers
from .models import Game, Round, Tournament, TournamentPlayer

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for user details. Customize this to include the fields you need.
    """
    class Meta:
        model = User
        fields = ('id', 'alias')

class GameSerializer(serializers.ModelSerializer):
    creator_detail = serializers.SerializerMethodField()
    player1_detail = serializers.SerializerMethodField()
    player2_detail = serializers.SerializerMethodField()
    winner_detail = serializers.SerializerMethodField()

    def get_user_detail(self, user):
        """
        Utility method to get user details.
        """
        if user:
            return UserSerializer(user).data
        return None

    def get_creator_detail(self, obj):
        return self.get_user_detail(obj.creator)

    def get_player1_detail(self, obj):
        return self.get_user_detail(obj.player1)

    def get_player2_detail(self, obj):
        return self.get_user_detail(obj.player2)
       
    def get_winner_detail(self, obj):
        return self.get_user_detail(obj.winner)
    

    class Meta:
        model = Game
        fields = [
            'id', 'name', 'game_type', 'state', 'start_time', 'end_time',
            'creator', 'password', 'max_players',
            'creator_detail', 'player1_detail', 'player2_detail',
            'player1_score', 'player2_score', 'winner_detail', 'tour', 'round'
        ]
        extra_kwargs = {
            'name': {
                'error_messages': {
                    'blank': 'Game Name field may not be blank.',
                    'null': 'Game Name field may not be null.',
                },
            },
            'game_type': {
                'error_messages': {
                    'blank': 'Game Type field may not be blank.',
                    'null': 'Game Type field may not be null.',
                },
            },
            # Add more custom messages for other fields if needed
        }

class GameTournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = [ 'id', 'name', 'game_type', 'state', 'creator', 'player1', 'player2', 'tour', 'round', 
                  'player1_score', 'player2_score', 'winner', 'end_time'
        ]
    
class GameStatProfileSerializer(serializers.ModelSerializer):
     pk_count = serializers.IntegerField(read_only=True)
     
     class Meta:
        model = Game
        fields = ['pk_count']

class RoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Round
        fields = ['name', 'level']       

class TournamentSerializer(serializers.ModelSerializer):
    # User.alias = OneUserSerializer(many=True)
    class Meta:
        model = Tournament
        fields = ['tour_id', 'name', 'org_id', 'status', 'nb_player', 'date_created', 'winner'] # OK OK

class TournamentDisplaySerializer(serializers.ModelSerializer):
    #own = UserSerializer()
    org_alias = serializers.SerializerMethodField()
    winner_alias = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = ['tour_id', 'name', 'org_id', 'org_alias', 'status', 'nb_player', 'date_created', 'winner', 'winner_alias']

    def get_org_alias(self, obj):
        return obj.org_id.alias if obj.org_id else None
    
    def get_winner_alias(self, obj):
        return obj.winner.alias if obj.winner else ''
    
class TourUniqueSerializer(serializers.ModelSerializer):
    class Meta:
            model = Tournament
            fields = ['name']
    
class TournamentPlayerSerializer(serializers.ModelSerializer):
    player_alias = serializers.SerializerMethodField()

    class Meta:
        model = TournamentPlayer
        fields = ['id', 'tournament', 'player', 'player_alias']

    def get_player_alias(self, obj):
        return obj.player.alias 

class GameTournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = [ 'id', 'name', 'game_type', 'state', 'creator', 'player1', 'player2', 'tour', 'round', 
                  'player1_score', 'player2_score', 'winner', 'end_time'
        ]

class RoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = Round
        fields = ['name', 'level']       

class TournamentSerializer(serializers.ModelSerializer):
    # User.alias = OneUserSerializer(many=True)
    class Meta:
        model = Tournament
        fields = ['tour_id', 'name', 'org_id', 'status', 'nb_player', 'date_created', 'winner'] # OK OK

class TournamentDisplaySerializer(serializers.ModelSerializer):
    #own = UserSerializer()
    org_alias = serializers.SerializerMethodField()
    winner_alias = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = ['tour_id', 'name', 'org_id', 'org_alias', 'status', 'nb_player', 'date_created', 'winner', 'winner_alias']

    def get_org_alias(self, obj):
        return obj.org_id.alias if obj.org_id else None
    
    def get_winner_alias(self, obj):
        return obj.winner.alias if obj.winner else ''
    
class TourUniqueSerializer(serializers.ModelSerializer):
    class Meta:
            model = Tournament
            fields = ['name']
    
class TournamentPlayerSerializer(serializers.ModelSerializer):
    player_alias = serializers.SerializerMethodField()

    class Meta:
        model = TournamentPlayer
        fields = ['id', 'tournament', 'player', 'player_alias']

    def get_player_alias(self, obj):
        return obj.player.alias 