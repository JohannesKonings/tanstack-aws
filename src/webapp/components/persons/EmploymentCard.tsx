import type { Employment } from '#src/webapp/types/person';
import { Badge } from '#src/webapp/components/ui/badge';
import { Button } from '#src/webapp/components/ui/button';
import { Briefcase, Building2, Calendar, DollarSign, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { ConfirmationModal } from './ConfirmationModal';

// oxlint-disable no-ternary

interface EmploymentCardProps {
  employment: Employment;
  onUpdate?: (employmentId: string, updates: Partial<Employment>) => void;
  onDelete?: (employmentId: string) => void;
  onEdit?: (employment: Employment) => void;
  isLoading?: boolean;
}

export const EmploymentCard = ({
  employment,
  onDelete,
  onEdit,
  isLoading,
}: EmploymentCardProps) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteConfirm = () => {
    onDelete?.(employment.id);
    setShowDeleteConfirm(false);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });

  const formatSalary = (salary?: number, currency?: string) => {
    if (!salary) {
      return null;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
  };

  return (
    <div className="group rounded-lg border border-white/30 bg-white/15 p-4 transition-colors hover:bg-white/25">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Briefcase className="mt-1 h-5 w-5 shrink-0 text-white/70" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{employment.position}</p>
              {employment.isCurrent && <Badge variant="secondary">Current</Badge>}
            </div>

            <div className="flex items-center gap-2 text-sm text-white/75">
              <Building2 className="h-3.5 w-3.5" />
              <span>{employment.companyName}</span>
              {employment.department && (
                <>
                  <span>•</span>
                  <span>{employment.department}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-white/75">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {formatDate(employment.startDate)} -{' '}
                {employment.endDate ? formatDate(employment.endDate) : 'Present'}
              </span>
            </div>

            {employment.salary && (
              <div className="flex items-center gap-2 text-sm text-white/75">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{formatSalary(employment.salary, employment.currency)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onEdit?.(employment)}
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
        title="Delete Employment"
        message="Are you sure you want to delete this employment record? This action cannot be undone."
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
