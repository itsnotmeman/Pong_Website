from django.urls import path

from . import views

urlpatterns = [
    path('csrf/', views.get_csrf, name='apiauth-csrf'),
    path('login/', views.login_view, name='apiauth-login'),
    path('logout/', views.logout_view, name='apiauth-logout'),
    path('sign_up/', views.sign_up_view, name='apiauth-sign_up'),
    path('session/', views.session_view, name='api-session'),
    path('whoami/', views.whoami_view, name='api-whoami'),
    path('whoamiid/', views.whoami_id_view, name='apiauth-whoamiid'),
	path('whoamialias/', views.whoami_alias_view, name='apiauth-whoamialias'),
]