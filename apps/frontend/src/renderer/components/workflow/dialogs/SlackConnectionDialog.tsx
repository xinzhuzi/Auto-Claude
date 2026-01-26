/**
 * Slack Connection Dialog Component
 * ==================================
 *
 * Dialog for connecting to Slack workspace.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Slack, ExternalLink, Info } from 'lucide-react';
import { Spinner } from '../common/Spinner';

interface SlackConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: () => Promise<void>;
  onManualToken: () => void;
}

export const SlackConnectionDialog: React.FC<SlackConnectionDialogProps> = ({
  open,
  onOpenChange,
  onConnect,
  onManualToken,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await onConnect();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to Slack');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Slack className="h-6 w-6 text-[#4A154B]" />
            <DialogTitle>Connect to Slack</DialogTitle>
          </div>
          <DialogDescription>
            Connect your Slack workspace to share workflows with your team.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              You'll be redirected to Slack to authorize this application. Make sure you
              have permission to install apps in your workspace.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Connection Steps */}
          <div className="space-y-2 text-sm">
            <p className="font-medium">What happens next:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>You'll be redirected to Slack</li>
              <li>Review and approve the permissions</li>
              <li>You'll be redirected back to continue</li>
            </ol>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={onManualToken}
            disabled={isConnecting}
            className="w-full sm:w-auto"
          >
            Use Manual Token
          </Button>
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full sm:w-auto gap-2"
          >
            {isConnecting ? (
              <>
                <Spinner size="sm" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                <span>Connect with Slack</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
