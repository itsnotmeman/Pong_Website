from django.contrib import admin
from django.shortcuts import render
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('apiauth/', include('apiauth.urls')),
    path('users/', include('users.urls')),
	path('api/', include('lobby.urls')),
	path('gameapp/', include('gameapp.urls')),
]
