from django.urls import path

from . import views

urlpatterns = [
    path('user/', views.user_list),
    path('user/<int:id>', views.user_detail),
    path('userUnique/', views.user_unique),
    path('myUserProfile/', views.myUserProfile),
    path('friend/', views.friends_list),
    path('friend/<int:id>', views.friend_detail),
    path('myfriend/', views.myfriends_list),
    path('allfriend/', views.allfriends_list),
    path('history/<int:id>', views.user_history),
    path('userStat/<int:id>', views.user_stat),
    path('blockedUserList/', views.blockedUser_list),
    path('oneUserBlocks/', views.oneUserBlocks_list),
]
