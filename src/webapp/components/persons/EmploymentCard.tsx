import { Briefcase, Building2, Calendar, DollarSign, Pencil, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Employment } from '#src/webapp/types/person';
import { Badge } from '#src/webapp/components/ui/badge';
import { Button } from '#src/webapp/components/ui/button';

interface EmploymentCardProps {
  employment: Employment;
  onUpdate?: (employmentId: string, updates: Partial<Employment>) => void;
  onDelete?: (employmentId: string) => void;
  isLoading?: boolean;
}

export const EmploymentCard = ({
  employment,
  onUpdate,
  onDelete,
  isLoading,
}: EmploymentCardProps) => {
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this employment record?')) {
      onDelete?.(employment.id);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
    });
  };

  const formatSalary = (salary?: number, currency?: string) => {
    if (!salary) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency ?? 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(salary);
  };

  return (
    <div className="group rounded-lg border p-4 transition-colors hover:bg-accent/50">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Briefcase className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{employment.position}</p>
              {employment.isCurrent && <Badge variant="secondary">Current</Badge>}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              <span>{employment.companyName}</span>
              {employment.department && (
                <>
                  <span>•</span>
                  <span>{employment.department}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {formatDate(employment.startDate)} -{' '}
                {employment.endDate ? formatDate(employment.endDate) : 'Present'}
              </span>
            </div>

            {employment.salary && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{formatSalary(employment.salary, employment.currency)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
