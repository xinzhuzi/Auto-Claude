/**
 * User Input IPC Handler
 * =======================
 *
 * Handles user input requests from Python workflow executor.
 * Displays dialog to user and returns response.
 */

import { ipcMain, BrowserWindow } from 'electron';
import { IPC_CHANNELS } from '../../../shared/constants/ipc';
import { logger } from '../../lib/logger';

interface UserInputRequest {
  requestId: string;
  question: string;
  options: string[];
  multiSelect: boolean;
}

interface UserInputResponse {
  requestId: string;
  response: any;
  cancelled: boolean;
}

// Store pending requests
const pendingRequests = new Map<string, UserInputRequest>();

/**
 * Register user input IPC handlers.
 */
export function registerUserInputHandlers() {
  /**
   * Handle user input request from Python backend.
   *
   * This is called when workflow execution encounters an AskUserQuestion node.
   * The workflow pauses until user provides input.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_REQUEST_USER_INPUT,
    async (event, request: UserInputRequest) => {
      try {
        logger.info('[UserInput] Received request:', request.requestId);

        // Store request
        pendingRequests.set(request.requestId, request);

        // Get main window
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (!mainWindow) {
          throw new Error('Main window not found');
        }

        // Send request to renderer process
        mainWindow.webContents.send(
          IPC_CHANNELS.WORKFLOW_USER_INPUT_REQUEST,
          request
        );

        logger.info('[UserInput] Sent request to renderer');

        return { success: true };
      } catch (error) {
        logger.error('[UserInput] Failed to handle request:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  /**
   * Handle user input response from renderer.
   *
   * Called when user submits or cancels the input dialog.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_SUBMIT_USER_INPUT,
    async (event, response: UserInputResponse) => {
      try {
        logger.info('[UserInput] Received response:', response.requestId);

        // Verify request exists
        const request = pendingRequests.get(response.requestId);
        if (!request) {
          throw new Error(`No pending request for ${response.requestId}`);
        }

        // Clean up
        pendingRequests.delete(response.requestId);

        // Send response back to Python backend via stdout
        // This will be handled by the workflow executor's stdin reader
        const responseMessage = {
          type: 'user_input_response',
          data: {
            request_id: response.requestId,
            response: response.response,
            cancelled: response.cancelled
          }
        };

        // Note: In the actual implementation, we need to send this to the
        // Python process's stdin. This requires access to the spawned process.
        // For now, we'll emit an event that the execution handler can listen to.
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send(
            IPC_CHANNELS.WORKFLOW_USER_INPUT_RESPONSE,
            responseMessage
          );
        }

        logger.info('[UserInput] Sent response to backend');

        return { success: true };
      } catch (error) {
        logger.error('[UserInput] Failed to handle response:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  /**
   * Get all pending user input requests.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_GET_PENDING_USER_INPUTS,
    async () => {
      try {
        const requests = Array.from(pendingRequests.values());
        return { success: true, data: requests };
      } catch (error) {
        logger.error('[UserInput] Failed to get pending requests:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  /**
   * Cancel a pending user input request.
   */
  ipcMain.handle(
    IPC_CHANNELS.WORKFLOW_CANCEL_USER_INPUT,
    async (event, requestId: string) => {
      try {
        logger.info('[UserInput] Cancelling request:', requestId);

        const request = pendingRequests.get(requestId);
        if (!request) {
          throw new Error(`No pending request for ${requestId}`);
        }

        // Clean up
        pendingRequests.delete(requestId);

        // Send cancellation to backend
        const responseMessage = {
          type: 'user_input_response',
          data: {
            request_id: requestId,
            response: null,
            cancelled: true
          }
        };

        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
          mainWindow.webContents.send(
            IPC_CHANNELS.WORKFLOW_USER_INPUT_RESPONSE,
            responseMessage
          );
        }

        return { success: true };
      } catch (error) {
        logger.error('[UserInput] Failed to cancel request:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  );

  logger.info('[UserInput] Handlers registered');
}

/**
 * Clean up all pending requests.
 */
export function cleanupUserInputRequests() {
  pendingRequests.clear();
  logger.info('[UserInput] Cleaned up pending requests');
}
