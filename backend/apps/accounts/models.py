from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core.phone import normalize_nepal_phone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create(self, email, password, **extra):
        if not email:
            raise ValueError("Email is required")
        user = self.model(email=self.normalize_email(email).lower(), **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("email_verified", True)
        return self._create(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=120)
    phone = models.CharField(max_length=16, blank=True, help_text="Normalised as +977XXXXXXXXXX")
    email_verified = models.BooleanField(default=False)
    email_notifications = models.BooleanField(
        default=True, help_text="Send booking updates by email as well as in the portal."
    )
    date_of_birth = models.DateField(null=True, blank=True)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = UserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name"]

    class Meta:
        ordering = ["-date_joined"]

    def __str__(self) -> str:
        return self.email

    def save(self, *args, **kwargs):
        self.email = self.email.lower()
        if self.phone:
            self.phone = normalize_nepal_phone(self.phone)
        super().save(*args, **kwargs)
