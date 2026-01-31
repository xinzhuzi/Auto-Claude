#!/usr/bin/env python3
"""
Custom MCP Servers Configuration Tests
=======================================

Tests for custom MCP server configuration validation and loading.
"""

import json
import tempfile
from pathlib import Path

import pytest

from core.client import _validate_custom_mcp_server, load_project_mcp_config


class TestCustomMCPServerValidation:
    """Test custom MCP server configuration validation."""

    def test_valid_http_server(self):
        """Test validation of a valid HTTP MCP server."""
        server = {
            "id": "test-http",
            "name": "Test HTTP Server",
            "type": "http",
            "url": "http://localhost:8000/mcp",
            "description": "Test HTTP MCP server",
        }
        assert _validate_custom_mcp_server(server) is True

    def test_valid_http_server_with_headers(self):
        """Test validation of HTTP server with authentication headers."""
        server = {
            "id": "test-http-auth",
            "name": "Test HTTP Server with Auth",
            "type": "http",
            "url": "http://localhost:8000/mcp",
            "headers": {
                "Authorization": "Bearer token123",
                "X-Custom-Header": "value",
            },
            "description": "Test HTTP MCP server with auth",
        }
        assert _validate_custom_mcp_server(server) is True

    def test_valid_command_server(self):
        """Test validation of a valid command-based MCP server."""
        server = {
            "id": "test-command",
            "name": "Test Command Server",
            "type": "command",
            "command": "uvx",
            "args": ["mcp-proxy", "--transport", "streamablehttp", "http://localhost:8000"],
            "description": "Test command MCP server",
        }
        assert _validate_custom_mcp_server(server) is True

    def test_invalid_missing_required_fields(self):
        """Test rejection of server missing required fields."""
        server = {
            "name": "Incomplete Server",
            "type": "http",
        }
        assert _validate_custom_mcp_server(server) is False

    def test_invalid_type(self):
        """Test rejection of server with invalid type."""
        server = {
            "id": "test-invalid",
            "name": "Invalid Type Server",
            "type": "websocket",  # Invalid type
            "url": "ws://localhost:8000",
        }
        assert _validate_custom_mcp_server(server) is False

    def test_invalid_dangerous_command(self):
        """Test rejection of dangerous shell commands."""
        server = {
            "id": "test-dangerous",
            "name": "Dangerous Server",
            "type": "command",
            "command": "bash",  # Dangerous command
            "args": ["-c", "echo hello"],
        }
        assert _validate_custom_mcp_server(server) is False

    def test_invalid_command_with_path(self):
        """Test rejection of commands with path separators."""
        server = {
            "id": "test-path",
            "name": "Path Command Server",
            "type": "command",
            "command": "/usr/bin/python",  # Path not allowed
            "args": ["script.py"],
        }
        assert _validate_custom_mcp_server(server) is False

    def test_invalid_dangerous_flags(self):
        """Test rejection of dangerous interpreter flags."""
        server = {
            "id": "test-flags",
            "name": "Dangerous Flags Server",
            "type": "command",
            "command": "python",
            "args": ["-c", "print('hello')"],  # -c flag not allowed
        }
        assert _validate_custom_mcp_server(server) is False

    def test_invalid_unexpected_fields(self):
        """Test rejection of servers with unexpected fields."""
        server = {
            "id": "test-extra",
            "name": "Extra Fields Server",
            "type": "http",
            "url": "http://localhost:8000",
            "malicious_field": "value",  # Unexpected field
        }
        assert _validate_custom_mcp_server(server) is False

    def test_http_server_missing_url(self):
        """Test rejection of HTTP server without URL."""
        server = {
            "id": "test-no-url",
            "name": "No URL Server",
            "type": "http",
        }
        assert _validate_custom_mcp_server(server) is False

    def test_command_server_missing_command(self):
        """Test rejection of command server without command."""
        server = {
            "id": "test-no-cmd",
            "name": "No Command Server",
            "type": "command",
            "args": ["arg1", "arg2"],
        }
        assert _validate_custom_mcp_server(server) is False


class TestProjectMCPConfig:
    """Test project MCP configuration loading."""

    def test_load_empty_config(self, tmp_path):
        """Test loading from project without .auto-claude/.env."""
        config = load_project_mcp_config(tmp_path)
        assert config == {}

    def test_load_custom_mcp_servers(self, tmp_path):
        """Test loading custom MCP servers from .env file."""
        # Create .auto-claude/.env with custom servers
        auto_claude_dir = tmp_path / ".auto-claude"
        auto_claude_dir.mkdir()
        env_file = auto_claude_dir / ".env"

        servers = [
            {
                "id": "metamcp",
                "name": "MetaMCP",
                "type": "http",
                "url": "http://localhost:12008/metamcp/ma-project/mcp",
                "headers": {"Authorization": "Bearer token123"},
                "description": "MetaMCP server",
            },
            {
                "id": "unitymcp",
                "name": "UnityMCP",
                "type": "command",
                "command": "uvx",
                "args": ["mcp-proxy", "--transport", "streamablehttp", "http://localhost:6400/mcp"],
                "description": "Unity MCP server",
            },
        ]

        env_content = f"CUSTOM_MCP_SERVERS={json.dumps(servers)}\n"
        env_file.write_text(env_content)

        config = load_project_mcp_config(tmp_path)
        assert "CUSTOM_MCP_SERVERS" in config
        assert len(config["CUSTOM_MCP_SERVERS"]) == 2
        assert config["CUSTOM_MCP_SERVERS"][0]["id"] == "metamcp"
        assert config["CUSTOM_MCP_SERVERS"][1]["id"] == "unitymcp"

    def test_load_invalid_json_servers(self, tmp_path):
        """Test handling of invalid JSON in CUSTOM_MCP_SERVERS."""
        auto_claude_dir = tmp_path / ".auto-claude"
        auto_claude_dir.mkdir()
        env_file = auto_claude_dir / ".env"

        env_content = "CUSTOM_MCP_SERVERS=[invalid json]\n"
        env_file.write_text(env_content)

        config = load_project_mcp_config(tmp_path)
        assert config.get("CUSTOM_MCP_SERVERS") == []

    def test_load_mcp_enable_flags(self, tmp_path):
        """Test loading MCP enable/disable flags."""
        auto_claude_dir = tmp_path / ".auto-claude"
        auto_claude_dir.mkdir()
        env_file = auto_claude_dir / ".env"

        env_content = """
CONTEXT7_ENABLED=true
LINEAR_MCP_ENABLED=false
ELECTRON_MCP_ENABLED=true
PUPPETEER_MCP_ENABLED=false
"""
        env_file.write_text(env_content)

        config = load_project_mcp_config(tmp_path)
        assert config.get("CONTEXT7_ENABLED") == "true"
        assert config.get("LINEAR_MCP_ENABLED") == "false"
        assert config.get("ELECTRON_MCP_ENABLED") == "true"
        assert config.get("PUPPETEER_MCP_ENABLED") == "false"

    def test_load_agent_mcp_overrides(self, tmp_path):
        """Test loading per-agent MCP overrides."""
        auto_claude_dir = tmp_path / ".auto-claude"
        auto_claude_dir.mkdir()
        env_file = auto_claude_dir / ".env"

        env_content = """
AGENT_MCP_coder_ADD=metamcp,unitymcp
AGENT_MCP_qa_reviewer_REMOVE=context7
"""
        env_file.write_text(env_content)

        config = load_project_mcp_config(tmp_path)
        assert config.get("AGENT_MCP_coder_ADD") == "metamcp,unitymcp"
        assert config.get("AGENT_MCP_qa_reviewer_REMOVE") == "context7"


class TestMCPServerIntegration:
    """Integration tests for MCP server configuration."""

    def test_metamcp_http_configuration(self):
        """Test MetaMCP HTTP server configuration."""
        server = {
            "id": "metamcp",
            "name": "MetaMCP",
            "type": "http",
            "url": "http://localhost:12008/metamcp/ma-project/mcp",
            "headers": {
                "Authorization": "Bearer sk_mt_mJASwC2cdTsZRpHUKRxNLay28KSeaceCoXZwqklDXDs4wcOjYH5bclnw05vKVumB"
            },
            "description": "MetaMCP HTTP server for MA project",
        }
        assert _validate_custom_mcp_server(server) is True

    def test_unitymcp_command_configuration(self):
        """Test UnityMCP command server configuration using uvx mcp-proxy."""
        server = {
            "id": "unitymcp",
            "name": "UnityMCP",
            "type": "command",
            "command": "uvx",
            "args": ["mcp-proxy", "--transport", "streamablehttp", "http://localhost:6400/mcp"],
            "description": "Unity MCP server for Unity asset management",
        }
        assert _validate_custom_mcp_server(server) is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
