from django.http import JsonResponse, HttpRequest
from django.db import IntegrityError
from rest_framework.decorators import api_view
from django.contrib.auth.decorators import login_required
from django.db.models import F, Count
from .models import User, Friend, BlockedUser
from .serializers import UserSerializer , UserUniqueSerializer, FriendSerializer
from .serializers import MyFriendSerializer, BlockedUserSerializer, oneUserBlocks
from lobby.models import Game
from lobby.serializers import GameSerializer, GameStatProfileSerializer
from rest_framework.response import Response
from rest_framework import status
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model

channel_layer = get_channel_layer()
User = get_user_model()

# User
@api_view(['GET', 'POST'])
def user_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    if request.method == 'GET':
        users = User.objects.all().order_by('alias')
        # print("SQL: ", users.query)
        serializer = UserSerializer(users, many=True)
        return JsonResponse(serializer.data, safe=False )
    elif request.method == 'POST':
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return JsonResponse(serializer.data, safe=False)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT'])
def user_detail(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    try:
        user = User.objects.get(id=id)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def user_unique(request):
    # if not request.user.is_authenticated:
    #     return JsonResponse({'isAuthenticated': "false"})
    if request.method == 'GET':
        users = User.objects.all()
        serializer = UserUniqueSerializer(users, many=True)
        return JsonResponse(serializer.data, safe=False )

# for profile modification
@api_view(['GET' , 'PUT'])
@login_required
def myUserProfile(request):
    curr_user = request.user.id
    try:
        user = User.objects.get(id=curr_user)
    except User.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = UserSerializer(user, data=request.data, partial=True)
        old_password = request.data.get("oldPassword")
        new_password = request.data.get("password")
        repeat_password = request.data.get("Repeatpassword")
        if (old_password != "") or (new_password != "") or (repeat_password != ""):
            if (old_password != "") and (new_password != "") and (repeat_password != ""):
                if user.check_password(old_password):
                    if new_password == repeat_password:
                        user.set_password(new_password)
                    else:
                        return Response({"error": "New passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response({"error": "Old password does not match."}, status=status.HTTP_400_BAD_REQUEST)
            else:
                return Response({"error": "All password fields need to be entered."}, status=status.HTTP_400_BAD_REQUEST)
        if serializer.is_valid():
            serializer.save()
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                str(curr_user),  # Users group id.
                {"type": "apiauth.signal",
                "message": "logout"},
            )
            return Response(serializer.data)

        return Response({"error": "User with this alias already exists."}, status=status.HTTP_400_BAD_REQUEST)


#Friend
@api_view(['GET', 'POST'])
def friends_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    if request.method == 'GET':
        friends = Friend.objects.all()
        # print("Friends ", friends.query )
        serializer = FriendSerializer(friends, many=True)
        return JsonResponse(serializer.data, safe=False)
    elif request.method == 'POST':
        requestor = request.user
        recipientAlias = request.POST["recipient"]
        #print("POST avant try ", recipientAlias)
        try:
            recipient  = User.objects.get(alias=recipientAlias)
        except User.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)
        myfriends = list(Friend.objects.values_list('recipient', flat=True).filter(requestor=request.user)) + list(Friend.objects.values_list('requestor', flat=True).filter(recipient=request.user))
        # print("myfriends ", myfriends)
        # print("after get ID recipient", recipient, " -- " )
        if recipient is not None and requestor != recipient and recipient.id not in myfriends:
            # serializer = FriendSerializer(data=request.data)
            newFriend = Friend(requestor=requestor, recipient=recipient)
            # if newFriend.is_valid():mak

            newFriend.save()
            return Response("Friend request has been sent", status=status.HTTP_201_CREATED)
            # return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    return Response("Bad Request",  status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'POST'])
def allfriends_list(request):
  if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
  if request.method == 'GET':
    myfriends = Friend.objects.filter(requestor=request.user).select_related().order_by('recipient').annotate(myfriend = F('recipient'))
    # print("myFriends ", myfriends.query )
    serializer = MyFriendSerializer(myfriends, many=True)
    return JsonResponse(serializer.data, safe=False)

@api_view(['GET'])
def myfriends_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
   
    if request.method == 'GET':
        myfriends = Friend.objects.filter(requestor=request.user).select_related().order_by('requestor').annotate(myfriend = F('recipient')) | Friend.objects.filter(recipient=request.user).select_related().order_by('recipient').annotate(myfriend = F('requestor'))
        serializer = MyFriendSerializer(myfriends, many=True)
        return JsonResponse(serializer.data, safe=False)
       

@api_view(['GET', 'PUT', 'DELETE'])
def friend_detail(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    try:
        friend = Friend.objects.get(friend_id=id)
    except Friend.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = FriendSerializer(friend)
        return Response(serializer.data)

    elif request.method == 'PUT':
        #print("detail PUT")
        #print(request)
        try:
            #print(request)
            serializer = FriendSerializer(friend, data=request.data, partial=True)
            #print(serializer)
            if serializer.is_valid():
                #print("SERIA OK")
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except IntegrityError as e:
            return Response({'error': 'this user is already a friend or request is pending.'}, status=status.HTTP_400_BAD_BAD_REQUEST)

    elif request.method == 'DELETE':
        #print("friend DELETE", request.user.id, friend.requestor.id, friend.recipient.id)
        if request.user.id == friend.requestor.id or request.user.id == friend.recipient.id:
            # print("requestor OK")

            friend.delete()
            return Response("Removed successful", status=status.HTTP_204_NO_CONTENT)
        return Response("Bad Request",  status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
def user_history(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    try:
        history = Game.objects.filter(player1=id, state="finished") | Game.objects.filter(player2=id, state="finished")
    except Game.DoesNotExist:
        return Response("KO sur view", status=status.HTTP_404_NOT_FOUND)
    serializer = GameSerializer(history, many=True)
    return JsonResponse(serializer.data, safe=False)

@api_view(['GET'])
def user_stat(request, id):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    # stat = Game.objects.filter(player1=id, state="finished").annotate(pk_count=Count('id')) affiche 1 ligne par match [{"pk_count": 1}, {"pk_count": 1}]
    stat = Game.objects.filter(winner=id, state="finished") #.aggregate(pk_count=Count('id')) #| Game.objects.filter(player2=id, state="finished").aggregate(pk_count=Count('id'))
    #print(" Count ", stat)
    #print(stat.query)
    # print(" num ", stat[0]) # CRASH
    # serializer = GameStatProfileSerializer(stat)
    # serializer = GameSerializer(stat)
    return Response("TEST")

#BlockedUser
@api_view(['POST'])
def blockedUser_list(request):
    #print("request: ", request.data)
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    reqBlocker = request.user
    #print("request User ", reqBlocker)
    reqBlocked = request["blocked"]
    #print ("Bloqued", reqBlocked)
    # if request.POST["blocked"] is not None:
    #     reqBlocked = User.objects.get(id=request.POST["blocked"])
    #     print("blocke User ", reqBlocked)
    #     newBlocked = BlockedUser(blocker=reqBlocker, blocked=reqBlocked)
    #     newBlocked.save()
    #     return Response("User is blocked")
    return Response("Bad Request",  status=status.HTTP_400_BAD_REQUEST)

#oneUserBlocks
@api_view(['GET'])
def oneUserBlocks_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})
    reqBlocker = request.user
    oneUserBlocks = BlockedUser.objects.filter(blocker=reqBlocker)

    if request.method == 'GET':
        serializer = BlockedUserSerializer(oneUserBlocks, many=True)
        return JsonResponse(serializer.data, safe=False)
