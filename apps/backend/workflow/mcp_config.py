"""
MCP Configuration Loader
=========================

Loads and manages MCP server configurations for workflow execution.

This module reads MCP server settings from Claude Code's configuration
and provides utilities for validating server availability.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class MCPConfig:
    """
    MCP server configuration manager.

    Loads MCP server configurations from Claude Code settings and
    provides utilities for server validation and caching.
    """

    def __init__(self, project_dir: Optional[Path] = None):
        """
        Initialize MCP configuration.

        Args:
            project_dir: Optional project directory for project-specific MCP settings
        """
        self.project_dir = project_dir
        self._servers: Optional[Dict[str, Any]] = None
        self._cache_timestamp: Optional[float] = None

    def load_servers(self) -> Dict[str, Any]:
        """
        Load MCP server configurations.

        Reads from multiple sources in priority order:
        1. Project-specific: {project_dir}/.claude/mcp_settings.json
        2. User global: ~/.claude/mcp_settings.json
        3. Claude Code config: ~/.config/claude/config.json

        Returns:
            Dictionary of server configurations keyed by server name
        """
        servers = {}

        # Try project-specific settings first
        if self.project_dir:
            project_mcp_file = self.project_dir / ".claude" / "mcp_settings.json"
            if project_mcp_file.exists():
                try:
                    with open(project_mcp_file, "r") as f:
                        project_config = json.load(f)
                        if "mcpServers" in project_config:
                            servers.update(project_config["mcpServers"])
                            logger.info(f"Loaded {len(servers)} MCP servers from project config")
                except Exception as e:
                    logger.warning(f"Failed to load project MCP config: {e}")

        # Try user global settings
        user_mcp_file = Path.home() / ".claude" / "mcp_settings.json"
        if user_mcp_file.exists():
            try:
                with open(user_mcp_file, "r") as f:
                    user_config = json.load(f)
                    if "mcpServers" in user_config:
                        # Merge with project config (project takes precedence)
                        for name, config in user_config["mcpServers"].items():
                            if name not in servers:
                                servers[name] = config
                        logger.info(f"Loaded {len(servers)} total MCP servers (including user config)")
            except Exception as e:
                logger.warning(f"Failed to load user MCP config: {e}")

        # Try Claude Code config
        claude_config_file = Path.home() / ".config" / "claude" / "config.json"
        if claude_config_file.exists():
            try:
                with open(claude_config_file, "r") as f:
                    claude_config = json.load(f)
                    if "mcpServers" in claude_config:
                        # Merge with existing configs
                        for name, config in claude_config["mcpServers"].items():
                            if name not in servers:
                                servers[name] = config
                        logger.info(f"Loaded {len(servers)} total MCP servers (including Claude Code config)")
            except Exception as e:
                logger.warning(f"Failed to load Claude Code config: {e}")

        # Cache the loaded servers
        self._servers = servers

        if not servers:
            logger.warning("No MCP servers configured")

        return servers

    def get_servers(self, force_reload: bool = False) -> Dict[str, Any]:
        """
        Get MCP server configurations (cached).

        Args:
            force_reload: If True, reload from disk even if cached

        Returns:
            Dictionary of server configurations
        """
        if force_reload or self._servers is None:
            return self.load_servers()
        return self._servers

    def get_server(self, server_name: str) -> Optional[Dict[str, Any]]:
        """
        Get configuration for a specific MCP server.

        Args:
            server_name: Name of the MCP server

        Returns:
            Server configuration dict, or None if not found
        """
        servers = self.get_servers()
        return servers.get(server_name)

    def validate_server(self, server_name: str) -> bool:
        """
        Validate that an MCP server is configured.

        Args:
            server_name: Name of the MCP server

        Returns:
            True if server is configured, False otherwise
        """
        server_config = self.get_server(server_name)
        if not server_config:
            logger.error(f"MCP server '{server_name}' not found in configuration")
            return False

        # Basic validation - check for required fields
        if "command" not in server_config:
            logger.error(f"MCP server '{server_name}' missing 'command' field")
            return False

        return True

    def list_servers(self) -> List[str]:
        """
        List all configured MCP server names.

        Returns:
            List of server names
        """
        servers = self.get_servers()
        return list(servers.keys())


# Global MCP config instance (lazy-loaded)
_global_mcp_config: Optional[MCPConfig] = None


def get_mcp_config(project_dir: Optional[Path] = None) -> MCPConfig:
    """
    Get global MCP configuration instance.

    Args:
        project_dir: Optional project directory

    Returns:
        MCPConfig instance
    """
    global _global_mcp_config

    if _global_mcp_config is None or project_dir is not None:
        _global_mcp_config = MCPConfig(project_dir)

    return _global_mcp_config
