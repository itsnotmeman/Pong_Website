from django.contrib import admin

from .models import User, Friend
from .models import BlockedUser


admin.site.register(User)
admin.site.register(Friend)
admin.site.register(BlockedUser)
