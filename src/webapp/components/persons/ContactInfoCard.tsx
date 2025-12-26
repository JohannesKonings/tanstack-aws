import { CheckCircle2, Mail, Phone, Pencil, Star, Trash2, Twitter, Linkedin } from 'lucide-react';
import { useState } from 'react';
import type { ContactInfo } from '#src/webapp/types/person';
import { Button } from '#src/webapp/components/ui/button';

interface ContactInfoCardProps {
  contact: ContactInfo;
  onUpdate?: (contactId: string, updates: Partial<ContactInfo>) => void;
  onDelete?: (contactId: string) => void;
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
  isLoading,
}: ContactInfoCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this contact?')) {
      onDelete?.(contact.id);
    }
  };

  const handleSetPrimary = () => {
    onUpdate?.(contact.id, { isPrimary: true });
  };

  const Icon = getContactIcon(contact.type);

  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Icon className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                {contact.type}
              </span>
              {contact.isPrimary && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  Primary
                </div>
              )}
              {contact.isVerified && (
                <div className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </div>
              )}
            </div>
            <p className="font-medium">{contact.value}</p>
          </div>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {!contact.isPrimary && (
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSetPrimary}
              disabled={isLoading}
              className="h-8 w-8"
              title="Set as primary"
            >
              <Star className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
            className="h-8 w-8"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDelete}
            disabled={isLoading}
            className="h-8 w-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
