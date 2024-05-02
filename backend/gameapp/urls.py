from django.urls import path

from . import views

urlpatterns = [
    path('start_game/<int:game_id>', views.start_game, name='start_game'),
    path('get_game_status/', views.get_game_status, name='get_game_status'),
    path('move_paddle/', views.move_paddle, name='move_paddle'),
    path('start_local_game/', views.start_local_game, name='start_local_game'),
]
