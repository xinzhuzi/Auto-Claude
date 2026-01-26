/**
 * Slack Share Dialog Component
 * =============================
 *
 * Dialog for sharing workflow to Slack.
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
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Alert, AlertDescription } from '../../ui/alert';
import { Slack, Send, CheckCircle } from 'lucide-react';
import { Spinner } from '../common/Spinner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../ui/select';

interface SlackChannel {
  id: string;
  name: string;
}

interface SlackShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowName: string;
  channels: SlackChannel[];
  onShare: (channelId: string, message?: string) => Promise<void>;
}

export const SlackShareDialog: React.FC<SlackShareDialogProps> = ({
  open,
  onOpenChange,
  workflowName,
  channels,
  onShare,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleShare = async () => {
    if (!selectedChannel) {
      setError('Please select a channel');
      return;
    }

    setIsSharing(true);
    setError(null);
    try {
      await onShare(selectedChannel, message || undefined);
      setIsSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
        setSelectedChannel('');
        setMessage('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share workflow');
    } finally {
      setIsSharing(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSharing) {
      setSelectedChannel('');
      setMessage('');
      setError(null);
      setIsSuccess(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Slack className="h-6 w-6 text-[#4A154B]" />
            <DialogTitle>Share to Slack</DialogTitle>
          </div>
          <DialogDescription>
            Share "{workflowName}" with your team on Slack.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center gap-3">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium">Workflow shared successfully!</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Channel Selection */}
            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select
                value={selectedChannel}
                onValueChange={setSelectedChannel}
                disabled={isSharing}
              >
                <SelectTrigger id="channel">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No channels available
                    </SelectItem>
                  ) : (
                    channels.map((channel) => (
                      <SelectItem key={channel.id} value={channel.id}>
                        #{channel.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Optional Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a message to share with the workflow..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={isSharing}
                rows={3}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground">
                {message.length} / 500 characters
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {!isSuccess && (
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSharing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={isSharing || !selectedChannel || channels.length === 0}
              className="gap-2"
            >
              {isSharing ? (
                <>
                  <Spinner size="sm" />
                  <span>Sharing...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Share</span>
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};
