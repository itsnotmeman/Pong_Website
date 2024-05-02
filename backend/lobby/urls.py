from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import GameViewSet, UserAliasView
from . import views

router = DefaultRouter()
router.register(r'games', GameViewSet)

urlpatterns = [
    path('user_alias/', UserAliasView.as_view(), name='user_alias'),
    path('game/create_from_invitation/', views.create_game_from_invitation, name='create_game_from_invitation'),
    path('update_blocked_status/', views.update_blocked_status, name='update_blocked_status'),
    path('get_blocked_status/', views.get_blocked_status, name='get_blocked_status'),
    path('', include(router.urls)),
    
    path('game/<int:id>', views.game_detail),
    path('round/', views.round_list),
    path('tour/', views.tournament_list),
    path('tour/<int:id>', views.tournament_detail),
    path('tourUnique/', views.tour_unique),
    path('tourPlayer/', views.tournamentPlayer_list),
    path('tourPlayer/<int:id>', views.tournamentPlayer_detail),
    path('oneTourPlayer/<int:id>', views.oneTournamentPlayer_list),
    path('oneTourGame/<int:id>', views.oneTournamentGame_list),
    path('mygame/<int:id>', views.myGame_list),
]
