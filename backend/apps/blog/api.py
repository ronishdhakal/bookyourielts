from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.permissions import AllowAny

from .models import Post


class PostListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Post
        fields = ["slug", "title", "excerpt", "author", "published_at", "updated_at"]


class PostSerializer(PostListSerializer):
    class Meta(PostListSerializer.Meta):
        fields = [*PostListSerializer.Meta.fields, "body", "meta_title"]


def published():
    return Post.objects.filter(is_published=True, published_at__lte=timezone.now())


class PostListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = PostListSerializer
    pagination_class = None
    filter_backends: list = []

    def get_queryset(self):
        return published()


class PostDetailView(generics.RetrieveAPIView):
    permission_classes = [AllowAny]
    serializer_class = PostSerializer
    filter_backends: list = []
    lookup_field = "slug"

    def get_queryset(self):
        return published()
