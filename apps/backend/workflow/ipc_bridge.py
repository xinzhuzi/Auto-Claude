"""
IPC Bridge for User Input
==========================

Handles bidirectional communication between Python workflow executor
and Electron frontend for user input requests.

Communication Flow:
1. Python sends user input request to stdout
2. Frontend receives request and displays dialog
3. User provides input
4. Frontend sends response back via stdin
5. Python receives response and resumes workflow
"""

import asyncio
import json
import logging
import sys
import uuid
from typing import Any, Dict, List, Optional

from debug import debug, debug_error, debug_success

logger = logging.getLogger(__name__)


class IPCBridge:
    """
    Manages IPC communication for user input requests.

    Uses stdout/stdin for communication with Electron frontend.
    """

    def __init__(self):
        """Initialize IPC bridge."""
        self.pending_requests: Dict[str, asyncio.Future] = {}
        self.stdin_reader_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start listening for responses from frontend."""
        if not self.stdin_reader_task:
            self.stdin_reader_task = asyncio.create_task(self._read_stdin())
            debug("ipc_bridge", "Started stdin reader")

    async def stop(self):
        """Stop listening for responses."""
        if self.stdin_reader_task:
            self.stdin_reader_task.cancel()
            try:
                await self.stdin_reader_task
            except asyncio.CancelledError:
                pass
            self.stdin_reader_task = None
            debug("ipc_bridge", "Stopped stdin reader")

    async def request_user_input(
        self,
        question: str,
        options: Optional[List[str]] = None,
        multi_select: bool = False,
        timeout: int = 300,
    ) -> Any:
        """
        Request user input from frontend.

        Args:
            question: Question to ask the user
            options: Optional list of predefined options
            multi_select: Whether user can select multiple options
            timeout: Timeout in seconds (default: 5 minutes)

        Returns:
            User's response (string, list, or dict depending on input type)

        Raises:
            TimeoutError: If user doesn't respond within timeout
            RuntimeError: If IPC communication fails
        """
        request_id = str(uuid.uuid4())

        debug("ipc_bridge", f"Requesting user input: {request_id}")
        debug("ipc_bridge", f"Question: {question}")

        # Create future for response
        future = asyncio.Future()
        self.pending_requests[request_id] = future

        # Send request to frontend via stdout
        request_message = {
            "type": "user_input_request",
            "data": {
                "request_id": request_id,
                "question": question,
      "options": options or [],
                "multi_select": multi_select,
            }
        }

        try:
            # Write to stdout (frontend will receive this)
            sys.stdout.write(json.dumps(request_message) + "\n")
            sys.stdout.flush()

            debug("ipc_bridge", f"Sent request to frontend: {request_id}")

            # Wait for response with timeout
            response = await asyncio.wait_for(future, timeout=timeout)

            debug_success("ipc_bridge", f"Received response for {request_id}")
            return response

        except asyncio.TimeoutError:
            error_msg = f"User input request {request_id} timed out after {timeout}s"
            debug_error("ipc_bridge", error_msg)

            # Clean up pending request
            self.pending_requests.pop(request_id, None)

            raise TimeoutError(error_msg)

        except Exception as e:
            error_msg = f"Failed to request user input: {str(e)}"
            debug_error("ipc_bridge", error_msg)
            logger.exception(error_msg)

            # Cleanup pending request
            self.pending_requests.pop(request_id, None)

            raise RuntimeError(error_msg)

    async def _read_stdin(self):
        """
        Read responses from stdin (sent by frontend).

        Runs in background task, processing incoming messages.
        """
        debug("ipc_bridge", "Starting stdin reader loop")

        try:
            loop = asyncio.get_event_loop()

            while True:
                # Read line from stdin (non-blocking)
                line = await loop.run_in_executor(None, sys.stdin.readline)

                if not line:
                    # EOF reached
                    debug("ipc_bridge", "Stdin closed")
                    break

                line = line.strip()
                if not line:
                    continue

                try:
                    # Parse JSON message
                    message = json.loads(line)

                    if message.get("type") == "user_input_response":
                        # User input response
                        await self._handle_user_input_response(message.get("data", {}))
                    else:
                        debug("ipc_bridge", f"Unknown message type: {message.get('type')}")

                except json.JSONDecodeError as e:
                    debug_error("ipc_bridge", f"Failed to parse stdin message: {line}")
                    logger.exception(f"JSON decode error: {e}")

        except asyncio.CancelledError:
            debug("ipc_bridge", "Stdin reader cancelled")
            raise

        except Exception as e:
            debug_error("ipc_bridge", f"Stdin reader error: {str(e)}")
            logger.exception("Stdin reader failed")

    async def _handle_user_input_response(self, data: Dict[str, Any]):
        """
        Handle user input response from frontend.

        Args:
            data: Response data containing request_id and response
        """
        request_id = data.get("request_id")
        response = data.get("response")
        cancelled = data.get("cancelled", False)

        if not request_id:
            debug_error("ipc_bridge", "Received response without request_id")
            return
        # Find pending request
        future = self.pending_requests.pop(request_id, None)

        if not future:
            debug_error("ipc_bridge", f"No pending request for {request_id}")
            return

        if future.done():
            debug_error("ipc_bridge", f"Request {request_id} already completed")
            return

        # Set result or exception
        if cancelled:
            debug("ipc_bridge", f"Request {request_id} was cancelled by user")
            future.set_exception(RuntimeError("User cancelled input"))
        else:
            debug("ipc_bridge", f"Setting response for {request_id}: {response}")
            future.set_result(response)


# Global IPC bridge instance
_ipc_bridge: Optional[IPCBridge] = None


async def get_ipc_bridge() -> IPCBridge:
    """
    Get or create global IPC bridge instance.

    Returns:
        Global IPCBridge instance
    """
    global _ipc_bridge

    if _ipc_bridge is None:
        _ipc_bridge = IPCBridge()
        await _ipc_bridge.start()

    return _ipc_bridge


async def request_user_input(
    question: str,
    options: Optional[List[str]] = None,
    multi_select: bool = False,
    timeout: int = 300,
) -> Any:
    """
    Convenience function to request user input.

    Args:
        question: Question to ask the user
        options: Optional list of predefined options
        multi_select: Whether user can select multiple options
        timeout: Timeout in seconds (default: 5 minutes)

    Returns:
        User's response

    Raises:
        TimeoutError: If user doesn't respond within timeout
        RuntimeError: If IPC communication fails
    """
    bridge = await get_ipc_bridge()
    return await bridge.request_user_input(
     question=question,
        options=options,
        multi_select=multi_select,
        timeout=timeout,
    )
