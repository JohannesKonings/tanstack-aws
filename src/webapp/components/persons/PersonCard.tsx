import { Briefcase, Landmark, Mail, MapPin, Phone } from 'lucide-react';
import type { PersonSummary } from '#src/webapp/types/person';
import { cn } from '#src/webapp/lib/utils';

interface PersonCardProps {
  person: PersonSummary;
  onClick?: () => void;
  selected?: boolean;
}

export const PersonCard = ({ person, onClick, selected }: PersonCardProps) => {
  const fullName = `${person.firstName} ${person.lastName}`;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm p-4 transition-colors',
        onClick && 'cursor-pointer hover:bg-white/20',
        selected && 'border-cyan-400 bg-white/20',
      )}
    >
      {/* Name */}
      <h3 className="font-semibold text-lg text-white">{fullName}</h3>

      {/* Info Grid */}
      <div className="mt-2 grid gap-1 text-sm text-white/70">
        {/* Location */}
        {(person.city ?? person.country) && (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span>{[person.city, person.country].filter(Boolean).join(', ')}</span>
          </div>
        )}

        {/* Email */}
        {person.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{person.email}</span>
          </div>
        )}

        {/* Phone */}
        {person.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            <span>{person.phone}</span>
          </div>
        )}

        {/* Employment */}
        {(person.companyName ?? person.position) && (
          <div className="flex items-center gap-2">
            <Briefcase className="h-3.5 w-3.5 shrink-0" />
            <span>
              {person.position && <span>{person.position}</span>}
              {person.position && person.companyName && ' at '}
              {person.companyName && <span className="font-medium">{person.companyName}</span>}
            </span>
          </div>
        )}

        {/* Bank */}
        {person.bankName && (
          <div className="flex items-center gap-2">
            <Landmark className="h-3.5 w-3.5 shrink-0" />
            <span>{person.bankName}</span>
          </div>
        )}
      </div>
    </div>
  );
};
