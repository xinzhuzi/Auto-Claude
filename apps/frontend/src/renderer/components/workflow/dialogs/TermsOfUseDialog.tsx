/**
 * Terms of Use Dialog Component
 * ==============================
 *
 * Dialog for displaying terms of use and privacy policy.
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
import { Checkbox } from '../common/Checkbox';
import { ScrollArea } from '../../ui/scroll-area';
import { FileText, ExternalLink } from 'lucide-react';

interface TermsOfUseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept: () => void;
  onDecline: () => void;
}

export const TermsOfUseDialog: React.FC<TermsOfUseDialogProps> = ({
  open,
  onOpenChange,
  onAccept,
  onDecline,
}) => {
  const [hasRead, setHasRead] = useState(false);
  const [hasAccepted, setHasAccepted] = useState(false);

  const handleAccept = () => {
    if (hasAccepted) {
      onAccept();
      onOpenChange(false);
    }
  };

  const handleDecline = () => {
    onDecline();
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setHasRead(false);
      setHasAccepted(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <DialogTitle>Terms of Use</DialogTitle>
          </div>
          <DialogDescription>
            Please review and accept the terms of use to continue.
          </DialogDescription>
        </DialogHeader>

        {/* Terms Content */}
        <ScrollArea
          className="flex-1 pr-4"
          onScrollCapture={(e) => {
            const target = e.target as HTMLElement;
            const isAtBottom =
              target.scrollHeight - target.scrollTop <= target.clientHeight + 50;
            if (isAtBottom && !hasRead) {
              setHasRead(true);
            }
          }}
        >
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold mb-2">1. Acceptance of Terms</h3>
              <p className="text-muted-foreground">
                By using this workflow studio, you agree to be bound by these Terms of Use.
                If you do not agree to these terms, please do not use this application.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">2. Use of Service</h3>
              <p className="text-muted-foreground">
                This workflow studio is provided for creating and managing AI-powered
                workflows. You agree to use the service only for lawful purposes and in
                accordance with these terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">3. Data and Privacy</h3>
              <p className="text-muted-foreground">
                Your workflows and data are stored locally on your device. We do not collect
                or transmit your workflow data to external servers unless you explicitly
                choose to share them (e.g., via Slack integration).
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">4. AI-Generated Content</h3>
              <p className="text-muted-foreground">
                Workflows generated or optimized by AI are provided as-is. You are
                responsible for reviewing and validating all AI-generated content before use
                in production environments.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">5. Third-Party Services</h3>
              <p className="text-muted-foreground">
                This application integrates with third-party services (Claude AI, MCP
                servers, etc). Your use of these services is subject to their respective
                terms of service and privacy policies.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">6. Limitation of Liability</h3>
              <p className="text-muted-foreground">
                This software is provided "as is" without warranty of any kind. We shall not
                be liable for any damages arising from the use or inability to use this
                application.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">7. Changes to Terms</h3>
              <p className="text-muted-foreground">
                We reserve the right to modify these terms at any time. Continued use of the
                application after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h3 className="font-semibold mb-2">8. Contact</h3>
              <p className="text-muted-foreground">
                For questions about these terms, please contact us through our GitHub
                repository.
              </p>
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs mt-2"
                onClick={() =>
                  window.open('https://github.com/anthropics/claude-code', '_blank')
                }
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Visit GitHub Repository
              </Button>
            </section>
          </div>
        </ScrollArea>

        {/* Acceptance Checkbox */}
        <div className="space-y-3 pt-4 border-t">
          <div className="flex items-start gap-3">
            <Checkbox
              id="accept-terms"
              checked={hasAccepted}
              onCheckedChange={(checked) => setHasAccepted(checked === true)}
              disabled={!hasRead}
            />
            <label
              htmlFor="accept-terms"
              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and accept the Terms of Use
              {!hasRead && (
                <span className="text-muted-foreground ml-1">
                  (scroll to bottom to enable)
                </span>
              )}
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleDecline}>
            Decline
          </Button>
          <Button onClick={handleAccept} disabled={!hasAccepted}>
            Accept and Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
