from rest_framework import serializers
from .models import User, Friend, BlockedUser

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'alias', 'avatar', 'played_matchs',
                   'won_matchs', 'status',
                    ]


class OneUserSerializer(serializers.ModelSerializer):
    class Meta:
            model = User
            fields = ['id', 'alias']

class UserUniqueSerializer(serializers.ModelSerializer):
    class Meta:
            model = User
            fields = ['name', 'alias']

class FriendSerializer(serializers.ModelSerializer):
    class Meta:
        model = Friend
        fields = ['friend_id', 'requestor' ,'recipient', 'accepted'  ]

class MyFriendSerializer(serializers.ModelSerializer):
    aliasreq = serializers.SerializerMethodField()
    aliasrec = serializers.SerializerMethodField()
    statusreq = serializers.SerializerMethodField()
    statusrec = serializers.SerializerMethodField()
    reqAvatar = serializers.SerializerMethodField()
    recAvatar = serializers.SerializerMethodField()

    class Meta:
        model = Friend
        fields = ['friend_id', 'requestor' ,'recipient', 'accepted',
                  'aliasreq', 'aliasrec', 'statusreq', 'statusrec', 'reqAvatar' , 'recAvatar']

    def get_aliasreq(self, obj):
         return obj.requestor.alias if obj.requestor else None

    def get_aliasrec(self, obj):
         return obj.recipient.alias if obj.recipient else None

    def get_statusreq(self, obj):
         return obj.requestor.status if obj.requestor else None

    def get_statusrec(self, obj):
         return obj.recipient.status if obj.recipient else None

    def get_reqAvatar(self, obj):
         return str(obj.requestor.avatar) if obj.requestor else None

    def get_recAvatar(self, obj):
         return str(obj.recipient.avatar) if obj.recipient else None

class BlockedUserSerializer(serializers.ModelSerializer):
     class Meta:
          model = BlockedUser
          fields = ['id', 'blocker', 'blocked']

class oneUserBlocks(serializers.ModelSerializer):
     class Meta:
          model = BlockedUser
          fields = ['blocked']
