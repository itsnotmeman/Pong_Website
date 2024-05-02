from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, UserManager
from django.utils import timezone
from django.contrib.auth.models import User

class CustomUserManager(UserManager):
    def _create_user(self, name, password, **extra_fields):
        if not name or not password or not name.isalnum():
            raise ValueError("You have not provided a valid username or password.")
        
        #name = self.normalize_email(name)
        user = self.model(name=name, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)

        return user
    
    def create_user(self, name=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        # extra_fields.setdefault('is_player', True)
        return self._create_user(name, password, **extra_fields)
    
    def create_superuser(self, name=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self._create_user(name, password, **extra_fields)
    
class User(AbstractBaseUser, PermissionsMixin):
    # email = models.EmailField(blank=True, default='') # unique=True)
    name = models.CharField(max_length=100, unique=True)
    alias = models.CharField(max_length=10, unique=True)
    avatar = models.ImageField(upload_to='avatars/', default='default_avatar.png')
    status = models.CharField(max_length=20, blank=True, null=True, default='offline')
    played_matchs = models.IntegerField(blank=True, null=True)
    won_matchs = models.IntegerField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_superuser = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    # is_player = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(blank=True, null=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'name'
    # EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = ['alias']

    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'
    
    def get_full_name(self):
        return self.name
    
    def get_short_name(self):
        return self.name
    
class Friend(models.Model):
    friend_id = models.AutoField(primary_key=True)
    requestor = models.ForeignKey(User, related_name='user1', on_delete=models.DO_NOTHING)
    recipient = models.ForeignKey(User, related_name='user2', on_delete=models.DO_NOTHING)
    accepted = models.BooleanField(blank=True, null=True)

    class Meta:
            unique_together = (('requestor', 'recipient'),)

    def __str__(self):
        return f'{self.requestor} et {self.recipient}'


class BlockedUser(models.Model):
    blocker = models.ForeignKey(User, related_name='blocked_users', on_delete=models.CASCADE)
    blocked = models.ForeignKey(User, related_name='blocked_by_users', on_delete=models.CASCADE)

    class Meta:
            unique_together = (('blocker', 'blocked'),)

    def __str__(self):
        return f'{self.blocker} blocks {self.blocked}'
   