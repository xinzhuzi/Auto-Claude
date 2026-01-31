/**
 * Slack Manual Token Dialog Component
 * ====================================
 *
 * Dialog for manually entering Slack token.
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
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Alert, AlertDescription } from '../../ui/alert';
import { Slack, ExternalLink, AlertCircle } from 'lucide-react';
import { Spinner } from '../common/Spinner';

interface SlackManualTokenDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuhandleSubmit: (token: string) => Promise<void>;
}

export const SlackManualTokenDialog: React.FC<SlackManualTokenDialogProps> = ({
  open,
  onOpenChange,
  onSuhandleSubmit,
}) => {
  const [token, setToken] = useState('');
  const [isSuhandleSubmitting, setIsSuhandleSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSuhandleSubmit = async () => {
    if (!token.trim()) {
      setError('Please enter a token');
      return;
    }

    if (!token.startsWith('xoxb-') && !token.startsWith('xoxp-')) {
      setError('Invalid token format. Token should start with xoxb- or xoxp-');
      return;
    }

    setIsSuhandleSubmitting(true);
    setError(null);
    try {
      await onSuhandleSubmit(token);
      onOpenChange(false);
      setToken('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate token');
    } finally {
      setIsSuhandleSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setToken('');
      setError(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Slack className="h-6 w-6 text-[#4A154B]" />
            <DialogTitle>Manual Slack Token</DialogTitle>
          </div>
          <DialogDescription>
            Enter your Slack Bot Token or User Token manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Token Input */}
          <div className="space-y-2">
            <Label htmlFor="slack-token">Slack Token</Label>
            <Input
              id="slack-token"
              type="password"
              placeholder="xoxb-... or xoxp-..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={isSuhandleSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Your token will be stored securely and never shared.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Help Text */}
          <Alert>
            <AlertDescription className="space-y-2">
              <p className="font-medium">How to get your token:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Go to api.slack.com/apps</li>
                <li>Select your app or create a new one</li>
                <li>Navigate to "OAuth & Permissions"</li>
                <li>Copy the "Bot User OAuth Token"</li>
              </ol>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={() => window.open('https://api.slack.com/apps', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Open Slack API
              </Button>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSuhandleSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSuhandleSubmit}
            disabled={isSuhandleSubmitting || !token.trim()}
            className="gap-2"
          >
            {isSuhandleSubmitting ? (
              <>
                <Spinner size="sm" />
                <span>Validating...</span>
              </>
            ) : (
              <span>Connect</span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
