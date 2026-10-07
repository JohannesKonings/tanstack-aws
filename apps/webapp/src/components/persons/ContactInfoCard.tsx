import {
  CheckCircleIcon,
  EnvelopeIcon,
  LinkedinLogoIcon,
  PencilIcon,
  PhoneIcon,
  StarIcon,
  TrashIcon,
  XLogoIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Card } from '#apps/webapp/components/ui/card';
import type { ContactInfo } from '#apps/webapp/types/person';
import { ConfirmationModal } from './ConfirmationModal';

interface ContactInfoCardProps {
  contact: ContactInfo;
  onUpdate?: (contactId: string, updates: Partial<ContactInfo>) => void;
  onDelete?: (contactId: string) => void;
  onEdit?: (contact: ContactInfo) => void;
  isLoading?: boolean;
}

function ContactTypeIcon({ type, className }: { type: string; className?: string }) {
  switch (type) {
    case 'email':
      return <EnvelopeIcon className={className} />;
    case 'phone':
    case 'mobile':
      return <PhoneIcon className={className} />;
    case 'linkedin':
      return <LinkedinLogoIcon className={className} />;
    case 'twitter':
      return <XLogoIcon className={className} />;
    default:
      return <EnvelopeIcon className={className} />;
  }
}

export const ContactInfoCard = ({
  contact,
  onUpdate,
  onDelete,
  onEdit,
  isLoading,
}: ContactInfoCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete?.(contact.id);
    setShowDeleteConfirm(false);
  };

  const handleSetPrimary = () => {
    onUpdate?.(contact.id, { isPrimary: true });
  };

  return (
    <Card className="group p-4 transition-colors hover:bg-surface-state-hover">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <ContactTypeIcon type={contact.type} className="mt-1 h-5 w-5 shrink-0 text-icon-muted" />
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="teal" className="capitalize">
                {contact.type}
              </Badge>
              {contact.isPrimary && (
                <Badge variant="warning" className="gap-1">
                  <StarIcon className="h-3 w-3 fill-current" weight="fill" />
                  Primary
                </Badge>
              )}
              {contact.isVerified && (
                <Badge variant="success" className="gap-1">
                  <CheckCircleIcon className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="font-medium text-text-primary">{contact.value}</p>
          </div>
        </div>

        <div className="flex gap-1">
          {!contact.isPrimary && (
            <Button
              variant="icon"
              color="gray"
              size="icon-sm"
              onClick={handleSetPrimary}
              disabled={isLoading}
              className="h-8 w-8 cursor-pointer"
              title="Set as primary"
            >
              <StarIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="icon"
            color="gray"
            size="icon-sm"
            onClick={() => onEdit?.(contact)}
            disabled={isLoading}
            className="h-8 w-8 cursor-pointer"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="icon"
            color="red"
            size="icon-sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
            className="h-8 w-8 cursor-pointer"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ConfirmationModal
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isOpen={showDeleteConfirm}
        isLoading={isLoading}
        isDangerous
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </Card>
  );
};
