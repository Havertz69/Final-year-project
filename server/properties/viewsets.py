"""
ViewSets for messaging and notifications with pagination and filtering
"""
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.db.models import Q
from accounts.permissions import AdminOnly, TenantOnly
from .models import Message, Notification
from .serializers import (
    MessageSerializer, MessageCreateSerializer, ConversationSerializer,
    NotificationSerializer, NotificationActionSerializer, UserSerializer,
    MessageListSerializer
)
from .services import MessageService, NotificationService

User = get_user_model()


class StandardResultsSetPagination(PageNumberPagination):
    """Standard pagination class"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class MessageViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Message model with proper filtering and permissions
    """
    queryset = Message.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['subject', 'body', 'sender__full_name', 'receiver__full_name']
    ordering_fields = ['timestamp', 'is_read']
    ordering = ['-timestamp']
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MessageCreateSerializer
        elif self.action == 'list':
            return MessageListSerializer
        return MessageSerializer
    
    def get_queryset(self):
        """Filter messages based on user role"""
        user = self.request.user
        
        if user.role == 'ADMIN':
            # Admins can see all messages they sent or received
            return Message.objects.filter(
                Q(sender=user) | Q(receiver=user)
            ).select_related('sender', 'receiver')
        else:
            # Tenants can only see messages with admins
            return Message.objects.filter(
                (Q(sender=user) & Q(receiver__role='ADMIN')) |
                (Q(receiver=user) & Q(sender__role='ADMIN'))
            ).select_related('sender', 'receiver')
    
    def perform_create(self, serializer):
        """Set sender from request user"""
        serializer.save(sender=self.request.user)
    
    @action(detail=False, methods=['get'])
    def conversations(self, request):
        """Get all conversations for the user"""
        conversations = MessageService.get_user_conversations(request.user)
        
        # Format response
        conversation_data = []
        for conv in conversations:
            conversation_data.append({
                'partner_id': conv['partner'].id,
                'partner_name': conv['partner'].full_name,
                'partner_role': conv['partner'].role,
                'last_message': MessageListSerializer(
                    conv['last_message'], 
                    context={'request': request}
                ).data,
                'unread_count': conv['unread_count']
            })
        
        return Response(conversation_data)
    
    @action(detail=False, methods=['get'])
    def inbox(self, request):
        """Get received messages"""
        messages = self.get_queryset().filter(receiver=request.user)
        page = self.paginate_queryset(messages)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def sent(self, request):
        """Get sent messages"""
        messages = self.get_queryset().filter(sender=request.user)
        page = self.paginate_queryset(messages)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark message as read"""
        message = self.get_object()
        if message.receiver == request.user:
            message.mark_as_read()
            return Response({'status': 'message marked as read'})
        return Response(
            {'error': 'Cannot mark message as read'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    @action(detail=False, methods=['get'], url_path=r'conversation/(?P<partner_id>\d+)')
    def conversation_detail(self, request, partner_id=None):
        """Get conversation with specific partner"""
        messages = MessageService.get_conversation_messages(request.user, partner_id)
        
        if messages is None:
            return Response(
                {'error': 'Conversation not found or access denied'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        page = self.paginate_queryset(messages)
        serializer = MessageListSerializer(page, many=True, context={'request': request})
        return self.get_paginated_response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def available_receivers(self, request):
        """Get list of users that can be messaged"""
        user = request.user
        
        if user.role == 'ADMIN':
            # Admins can message all tenants
            receivers = User.objects.filter(role='TENANT')
        else:
            # Tenants can only message admins
            receivers = User.objects.filter(role='ADMIN')
        
        serializer = UserSerializer(receivers, many=True)
        return Response(serializer.data)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Notification model with pagination and filtering
    """
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'message']
    ordering_fields = ['created_at', 'is_read']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter notifications for current user only"""
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def mark_read(self, request):
        """Mark notifications as read"""
        serializer = NotificationActionSerializer(data=request.data)
        
        if serializer.is_valid():
            action = serializer.validated_data['action']
            notification_ids = serializer.validated_data.get('notification_ids')
            
            if action == 'mark_all_read':
                count = NotificationService.mark_notifications_as_read(request.user)
            else:
                count = NotificationService.mark_notifications_as_read(
                    request.user, notification_ids
                )
            
            return Response({
                'status': f'{count} notifications marked as read'
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_single_read(self, request, pk=None):
        """Mark single notification as read"""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'notification marked as read'})
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get count of unread notifications"""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['get'])
    def unread(self, request):
        """Get only unread notifications"""
        notifications = self.get_queryset().filter(is_read=False)
        page = self.paginate_queryset(notifications)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get notifications by type"""
        notification_type = request.query_params.get('type')
        if notification_type:
            notifications = self.get_queryset().filter(
                notification_type=notification_type
            )
        else:
            notifications = self.get_queryset()
        
        page = self.paginate_queryset(notifications)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
