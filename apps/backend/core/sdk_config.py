"""
SDK Configuration Constants
============================

Centralized configuration for Claude Agent SDK client options.
This ensures consistent behavior across all client creation points.
"""

# Default buffer size for SDK clients (100MB)
# Handles large tool results, file reads, and MCP responses
DEFAULT_MAX_BUFFER_SIZE = 100 * 1024 * 1024

# Large buffer size for document analysis tasks (100MB)
# Used when processing very large documents or codebases
LARGE_BUFFER_SIZE = 100 * 1024 * 1024

# Minimum buffer size to prevent crashes (10MB)
MIN_BUFFER_SIZE = 10 * 1024 * 1024

# Error patterns that indicate buffer size issues
BUFFER_ERROR_PATTERNS = [
    "max_buffer_size",
    "buffer size exceeded",
    "message too large",
    "exceeded max buffer",
    "payload too large",
    "json message exceeded",
    "failed to decode json",
]
