from django.contrib.auth import authenticate, login, logout
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import ensure_csrf_cookie
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.core.files.storage import FileSystemStorage
from django.conf import settings
import os

channel_layer = get_channel_layer()
User = get_user_model()


def get_csrf(request):
    response = JsonResponse({'detail': 'CSRF cookie set'})
    response['X-CSRFToken'] = get_token(request)
    return response

@require_POST
def sign_up_view(request):
    username = request.POST["username"]
    password = request.POST["password"]
    alias = request.POST["alias"]

    if not alias.isalnum():
        return JsonResponse({"detail": "The alias must be alphanumeric."}, status=400)

    avatar = request.FILES.get('avatar')
    if avatar:
        # print("avatar file: ", avatar)
        file_name = "avatars/" + os.path.basename(avatar.name)
        # print(type(file_name))
        file_name = file_name.replace(" ", "_")
        # print(type(file_name))
        # print("file_name", file_name)
        fs = FileSystemStorage(location=settings.MEDIA_ROOT)
        # print("fs", fs)
        filename = fs.save(file_name, avatar)
        uploaded_file_url = fs.url(filename)

    try:
        if username is None or password is None or alias is None:
            return JsonResponse({'detail': 'Please provide username and password and alias.'}, status=400)

        # Check if username already exists
        if User.objects.filter(name=username).exists():
            return JsonResponse({"detail": "User with this username already exists."}, status=400)

        # Check if alias already exists
        if User.objects.filter(alias=alias).exists():
            return JsonResponse({"detail": "User with this alias already exists."}, status=400)

        if avatar:
            user = User.objects.create_user(username, password=password, alias=alias, avatar=file_name)
        else:
            user = User.objects.create_user(username, password=password, alias=alias)
        # user.save()  Maybe not needed.
    except Exception as err:
        return JsonResponse({"detail": "An integrity error occurred."}, status=400)

    async_to_sync(channel_layer.group_send)(
        "global_chat",
        {
            "type": "broadcast_user_list"
        }
    )

    return JsonResponse({'detail': 'Successfully signed up.'})

@require_POST
def login_view(request):
    username = request.POST.get("username")
    password = request.POST.get("password")

    if username is None or password is None:
        return JsonResponse({'detail': 'Please provide username and password.'}, status=400)

    user = authenticate(request, username=username, password=password)

    if user is None:
        return JsonResponse({'detail': 'Invalid credentials.'}, status=400)

    login(request, user)

    if user.status == "offline":
        user.status = "online"
        user.save()
    elif user.status == "playing_offline":
        user.status = "playing_online"
        user.save()

    # Setting a cookie after successful login
    response = JsonResponse({'detail': 'Successfully logged in.'})
    response.set_cookie('user_alias', user.alias, max_age=86400)
    response.set_cookie('user_id', user.id, max_age=86400)
    return response

@login_required
def logout_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'You\'re not logged in.'}, status=400)

    if request.user.status == "online":
        request.user.status = "offline"
        request.user.save()
    elif request.user.status == "playing_online":
        request.user.status = "playing_offline"
        request.user.save()

    # Perform the logout operation to clear the session
    logout(request)

    # Prepare the response
    response = JsonResponse({'detail': 'Successfully logged out.'})

    # Delete the 'user_alias' cookie by setting its expiry to the past
    response.delete_cookie('user_alias')
    response.delete_cookie('user_id')
    # Return the response, which now includes the instruction to delete the cookie
    return response


@ensure_csrf_cookie
def session_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})

    return JsonResponse({'isAuthenticated': "true"})

def whoami_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})

    return JsonResponse({'username': request.user.name, 'avat_img': str(request.user.avatar)})

def whoami_id_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})

    return JsonResponse({'id': request.user.id})

@login_required
def whoami_alias_view(request):
    if not request.user.is_authenticated:
        return JsonResponse({'isAuthenticated': "false"})

    # Assuming the User model has an 'alias' field or a method to get the alias
    return JsonResponse({
        'isAuthenticated': "true",
        'alias': request.user.alias
    })
