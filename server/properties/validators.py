"""
File upload validators for PropertyPulse PMS.
"""
import os
from django.core.exceptions import ValidationError
from django.conf import settings


ALLOWED_CONTENT_TYPES = getattr(
    settings,
    'ALLOWED_UPLOAD_CONTENT_TYPES',
    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
)

ALLOWED_EXTENSIONS = getattr(
    settings,
    'ALLOWED_UPLOAD_EXTENSIONS',
    ['.jpg', '.jpeg', '.png', '.webp', '.pdf'],
)

MAX_UPLOAD_MB = 5


def validate_file_type(file):
    """Reject uploads that are not images or PDFs."""
    content_type = getattr(file, 'content_type', None)
    if content_type and content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationError(
            f'Unsupported file type: {content_type}. '
            f'Allowed types: JPEG, PNG, WebP, PDF.'
        )

    # Also check extension as a secondary guard
    ext = os.path.splitext(file.name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f'Unsupported file extension: {ext}. '
            f'Allowed: {", ".join(ALLOWED_EXTENSIONS)}'
        )


def validate_file_size(file):
    """Reject files larger than MAX_UPLOAD_MB MB."""
    max_bytes = MAX_UPLOAD_MB * 1024 * 1024
    if file.size > max_bytes:
        raise ValidationError(
            f'File too large. Maximum allowed size is {MAX_UPLOAD_MB} MB. '
            f'Your file is {file.size / (1024 * 1024):.1f} MB.'
        )


def validate_upload(file):
    """Run all upload validators."""
    validate_file_type(file)
    validate_file_size(file)
