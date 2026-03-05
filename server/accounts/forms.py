from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import User


class CustomUserCreationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ('email', 'full_name', 'phone_number', 'role')

    def save(self, commit=True):
        user = super().save(commit=False)
        # Fallback to avoid null constraint since DRF or Django admin logic expects a valid username
        if not user.username:
            user.username = user.email.split('@')[0]
        if commit:
            user.save()
        return user


class CustomUserChangeForm(UserChangeForm):
    class Meta:
        model = User
        fields = ('email', 'full_name', 'phone_number', 'role', 'is_active', 'is_staff', 'is_superuser')
