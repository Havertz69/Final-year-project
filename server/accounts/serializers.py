from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        validators=[validate_password]
    )
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('email', 'full_name', 'phone_number', 'role', 'password', 'password_confirm')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if not email or not password:
            raise serializers.ValidationError('Must include email and password.')

        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password
        )

        # Use a single generic message for all failures — prevents user enumeration.
        # An attacker must not be able to distinguish "email not found" from "wrong password".
        if not user or not user.is_active:
            raise serializers.ValidationError('Invalid email or password.')

        attrs['user'] = user
        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'phone_number', 'role', 'is_active', 'date_joined')
        read_only_fields = ('id', 'email', 'role', 'date_joined')


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'email', 'full_name', 'phone_number', 'role', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')
