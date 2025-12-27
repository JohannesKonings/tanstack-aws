import type { ContactInfo } from '#src/webapp/types/person';
import { Button } from '#src/webapp/components/ui/button';
import { CheckCircle2, Linkedin, Mail, Pencil, Phone, Star, Trash2, Twitter } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationModal } from './ConfirmationModal';

interface ContactInfoCardProps {
  contact: ContactInfo;
  onUpdate?: (contactId: string, updates: Partial<ContactInfo>) => void;
  onDelete?: (contactId: string) => void;
  onEdit?: (contact: ContactInfo) => void;
  isLoading?: boolean;
}

const getContactIcon = (type: string) => {
  switch (type) {
    case 'email':
      return Mail;
    case 'phone':
    case 'mobile':
      return Phone;
    case 'linkedin':
      return Linkedin;
    case 'twitter':
      return Twitter;
    default:
      return Mail;
  }
};

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

  const Icon = getContactIcon(contact.type);

  return (
    <div className="group rounded-lg border border-white/30 bg-white/15 p-4 transition-colors hover:bg-white/25">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Icon className="mt-1 h-5 w-5 shrink-0 text-white/70" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-xs font-medium capitalize text-cyan-300">
                {contact.type}
              </span>
              {contact.isPrimary && (
                <div className="flex items-center gap-1 text-xs text-white/75">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  Primary
                </div>
              )}
              {contact.isVerified && (
                <div className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </div>
              )}
            </div>
            <p className="font-medium text-white">{contact.value}</p>
          </div>
        </div>

        <div className="flex gap-1">
          {!contact.isPrimary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSetPrimary}
              disabled={isLoading}
              className="h-8 w-8 cursor-pointer"
              title="Set as primary"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit?.(contact)}
            disabled={isLoading}
            className="h-8 w-8 cursor-pointer"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isLoading}
            className="h-8 w-8 cursor-pointer text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
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
    </div>
  );
};
