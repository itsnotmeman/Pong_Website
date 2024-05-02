from django.contrib import admin
from .models import Game, Round, Tournament, TournamentPlayer

admin.site.register(Game)
admin.site.register(Round)
admin.site.register(Tournament)
admin.site.register(TournamentPlayer)
