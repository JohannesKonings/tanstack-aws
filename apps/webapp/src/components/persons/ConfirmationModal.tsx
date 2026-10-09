import { Button } from '#apps/webapp/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '#apps/webapp/components/ui/dialog';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isOpen: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isDangerous?: boolean;
}

export const ConfirmationModal = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isOpen,
  isLoading = false,
  onConfirm,
  onCancel,
  isDangerous = false,
}: ConfirmationModalProps) => (
  <Dialog
    open={isOpen}
    onOpenChange={(open) => {
      if (!open && !isLoading) {
        onCancel();
      }
    }}
  >
    <DialogContent size="xs">
      <DialogHeader title={title} showClose={!isLoading} />
      <DialogBody>
        <p className="text-sm text-text-muted">{message}</p>
      </DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
          {cancelLabel}
        </Button>
        <Button
          variant="primary"
          color={isDangerous ? 'red' : 'neutral'}
          onClick={onConfirm}
          disabled={isLoading}
        >
          {confirmLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
