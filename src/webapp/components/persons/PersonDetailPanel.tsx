// oxlint-disable no-ternary
// oxlint-disable no-magic-numbers
import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CreditCard,
  DollarSign,
  Landmark,
  Linkedin,
  Mail,
  MapPin,
  Phone,
  Star,
  Twitter,
  User,
  X,
} from 'lucide-react';
import type { Address, BankAccount, ContactInfo, Employment } from '#src/webapp/types/person';
import { usePersonDetail } from '#src/webapp/hooks/useDbPersons';

interface PersonDetailPanelProps {
  personId: string;
  onClose: () => void;
}

export const PersonDetailPanel = ({ personId, onClose }: PersonDetailPanelProps) => {
  const { person, addresses, contacts, employments, bankAccounts, isLoading } =
    usePersonDetail(personId);

  if (isLoading) {
    return (
      <div className="p-6 rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm">
        <div className="animate-pulse text-white/70">Loading person details...</div>
      </div>
    );
  }

  if (!person) {
    return null;
  }

  return (
    <div className="rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 bg-white/10">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-cyan-400" />
          <div>
            <h2 className="text-xl font-semibold text-white">
              {person.firstName} {person.lastName}
            </h2>
            <p className="text-sm text-white/60">ID: {person.id}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content Grid */}
      <div className="p-4 grid gap-4 md:grid-cols-2">
        {/* Addresses */}
        <DetailSection title="Addresses" icon={MapPin} count={addresses.length}>
          <AddressList addresses={addresses} />
        </DetailSection>

        {/* Contacts */}
        <DetailSection title="Contact Info" icon={Mail} count={contacts.length}>
          <ContactList contacts={contacts} />
        </DetailSection>

        {/* Employment */}
        <DetailSection title="Employment" icon={Briefcase} count={employments.length}>
          <EmploymentList employments={employments} />
        </DetailSection>

        {/* Bank Accounts */}
        <DetailSection title="Bank Accounts" icon={Landmark} count={bankAccounts.length}>
          <BankAccountList accounts={bankAccounts} />
        </DetailSection>
      </div>
    </div>
  );
};

// Helper Components

interface DetailSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
}

const DetailSection = ({ title, icon: Icon, count, children }: DetailSectionProps) => (
  <div className="rounded-lg border border-white/20 bg-white/5 overflow-hidden">
    <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-white/5">
      <Icon className="h-4 w-4 text-cyan-400" />
      <h3 className="font-medium text-white">{title}</h3>
      <span className="ml-auto text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
        {count}
      </span>
    </div>
    <div className="p-3 space-y-2 max-h-48 overflow-y-auto">{children}</div>
  </div>
);

const EmptyState = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-white/50 italic">{children}</p>
);

// List wrappers to avoid ternaries
const AddressList = ({ addresses }: { addresses: Address[] }) => {
  if (addresses.length === 0) {
    return <EmptyState>No addresses</EmptyState>;
  }
  return (
    <>
      {addresses.map((address) => (
        <AddressItem key={address.id} address={address} />
      ))}
    </>
  );
};

const ContactList = ({ contacts }: { contacts: ContactInfo[] }) => {
  if (contacts.length === 0) {
    return <EmptyState>No contacts</EmptyState>;
  }
  return (
    <>
      {contacts.map((contact) => (
        <ContactItem key={contact.id} contact={contact} />
      ))}
    </>
  );
};

const EmploymentList = ({ employments }: { employments: Employment[] }) => {
  if (employments.length === 0) {
    return <EmptyState>No employment records</EmptyState>;
  }
  return (
    <>
      {employments.map((emp) => (
        <EmploymentItem key={emp.id} employment={emp} />
      ))}
    </>
  );
};

const BankAccountList = ({ accounts }: { accounts: BankAccount[] }) => {
  if (accounts.length === 0) {
    return <EmptyState>No bank accounts</EmptyState>;
  }
  return (
    <>
      {accounts.map((account) => (
        <BankAccountItem key={account.id} account={account} />
      ))}
    </>
  );
};

const AddressItem = ({ address }: { address: Address }) => (
  <div className="p-2 rounded bg-white/5 text-sm">
    <div className="flex items-center gap-2 mb-1">
      <span className="text-xs bg-cyan-600/30 text-cyan-300 px-1.5 py-0.5 rounded capitalize">
        {address.type}
      </span>
      {address.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
    </div>
    <p className="text-white/90">{address.street}</p>
    <p className="text-white/70">
      {address.city}, {address.state} {address.postalCode}
    </p>
    <p className="text-white/60">{address.country}</p>
  </div>
);

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

const ContactItem = ({ contact }: { contact: ContactInfo }) => {
  const Icon = getContactIcon(contact.type);
  return (
    <div className="p-2 rounded bg-white/5 text-sm flex items-start gap-2">
      <Icon className="h-4 w-4 mt-0.5 text-white/60" />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-cyan-600/30 text-cyan-300 px-1.5 py-0.5 rounded capitalize">
            {contact.type}
          </span>
          {contact.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
          {contact.isVerified && <CheckCircle2 className="h-3 w-3 text-green-400" />}
        </div>
        <p className="text-white/90 mt-1">{contact.value}</p>
      </div>
    </div>
  );
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

const getEndDateDisplay = (endDate?: string | null) => {
  if (endDate) {
    return formatDate(endDate);
  }
  return 'Present';
};

const EmploymentItem = ({ employment }: { employment: Employment }) => (
  <div className="p-2 rounded bg-white/5 text-sm">
    <div className="flex items-center gap-2 mb-1">
      <span className="font-medium text-white/90">{employment.position}</span>
      {employment.isCurrent && (
        <span className="text-xs bg-green-600/30 text-green-300 px-1.5 py-0.5 rounded">
          Current
        </span>
      )}
    </div>
    <div className="flex items-center gap-2 text-white/70">
      <Building2 className="h-3.5 w-3.5" />
      <span>{employment.companyName}</span>
      {employment.department && (
        <>
          <span>•</span>
          <span>{employment.department}</span>
        </>
      )}
    </div>
    <div className="flex items-center gap-2 text-white/60 mt-1">
      <Calendar className="h-3.5 w-3.5" />
      <span>
        {formatDate(employment.startDate)} - {getEndDateDisplay(employment.endDate)}
      </span>
    </div>
    {employment.salary && (
      <div className="flex items-center gap-2 text-white/60 mt-1">
        <DollarSign className="h-3.5 w-3.5" />
        <span>{formatSalary(employment.salary, employment.currency)}</span>
      </div>
    )}
  </div>
);

const BankAccountItem = ({ account }: { account: BankAccount }) => (
  <div className="p-2 rounded bg-white/5 text-sm">
    <div className="flex items-center gap-2 mb-1">
      <span className="font-medium text-white/90">{account.bankName}</span>
      {account.isPrimary && <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />}
    </div>
    <div className="flex items-center gap-2 text-white/70">
      <CreditCard className="h-3.5 w-3.5" />
      <span className="capitalize">{account.accountType}</span>
      <span>•</span>
      <span>****{account.accountNumberLast4}</span>
    </div>
    {account.iban && <p className="text-xs text-white/50 mt-1">IBAN: {account.iban}</p>}
    {account.bic && <p className="text-xs text-white/50">BIC: {account.bic}</p>}
  </div>
);
