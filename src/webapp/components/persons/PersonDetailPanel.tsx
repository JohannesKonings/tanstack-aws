import type {
  Address,
  BankAccount,
  ContactInfo,
  Employment,
  Person,
} from '#src/webapp/types/person';
import { usePersonDetail } from '#src/webapp/hooks/useDbPersons';
// oxlint-disable no-ternary
// oxlint-disable no-magic-numbers
// oxlint-disable id-length
// oxlint-disable max-statements
import { Briefcase, Edit2, Landmark, Mail, MapPin, Plus, Trash2, User, X } from 'lucide-react';
import { useState } from 'react';
import { AddressCard } from './AddressCard';
import { AddressFormModal } from './AddressFormModal.tsx';
import { BankAccountCard } from './BankAccountCard';
import { BankAccountFormModal } from './BankAccountFormModal.tsx';
import { ContactFormModal } from './ContactFormModal.tsx';
import { ContactInfoCard } from './ContactInfoCard';
import { EmploymentCard } from './EmploymentCard';
import { EmploymentFormModal } from './EmploymentFormModal.tsx';
import { PersonEditModal } from './PersonEditModal.tsx';

interface PersonDetailPanelProps {
  personId: string;
  onClose: () => void;
}

export const PersonDetailPanel = ({ personId, onClose }: PersonDetailPanelProps) => {
  const {
    person,
    addresses,
    contacts,
    employments,
    bankAccounts,
    isLoading,
    updatePerson,
    deletePerson,
    addAddress,
    updateAddress,
    deleteAddress,
    addContact,
    updateContact,
    deleteContact,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addEmployment,
    updateEmployment,
    deleteEmployment,
  } = usePersonDetail(personId);

  const [editingPerson, setEditingPerson] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactInfo | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [addingBankAccount, setAddingBankAccount] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<Employment | null>(null);
  const [addingEmployment, setAddingEmployment] = useState(false);

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

  const handleDeletePerson = () => {
    if (confirm('Are you sure you want to delete this person? This cannot be undone.')) {
      deletePerson();
      onClose();
    }
  };

  return (
    <>
      <div className="rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm overflow-hidden max-h-[calc(100vh-300px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/20 bg-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-cyan-400" />
            <div>
              <h2 className="text-xl font-semibold text-white">
                {person.firstName} {person.lastName}
              </h2>
              <p className="text-sm text-white/60">ID: {person.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingPerson(true)}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Edit person"
            >
              <Edit2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleDeletePerson}
              className="p-2 rounded-lg hover:bg-red-500/20 text-white/70 hover:text-red-300 transition-colors"
              title="Delete person"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Grid - Scrollable */}
        <div className="p-4 grid gap-4 md:grid-cols-2 overflow-y-auto flex-1">
          {/* Addresses */}
          <DetailSection
            title="Addresses"
            icon={MapPin}
            count={addresses.length}
            onAdd={() => setAddingAddress(true)}
          >
            {addresses.length === 0 ? (
              <p className="text-sm text-white/50 italic">No addresses</p>
            ) : (
              addresses.map((addressItem) => (
                <AddressCard
                  key={addressItem.id}
                  address={addressItem}
                  onUpdate={(id, updates) => updateAddress(id, updates)}
                  onDelete={(id) => deleteAddress(id)}
                  onEdit={(address) => setEditingAddress(address)}
                />
              ))
            )}
          </DetailSection>

          {/* Contacts */}
          <DetailSection
            title="Contact Info"
            icon={Mail}
            count={contacts.length}
            onAdd={() => setAddingContact(true)}
          >
            {contacts.length === 0 ? (
              <p className="text-sm text-white/50 italic">No contacts</p>
            ) : (
              contacts.map((contactItem) => (
                <ContactInfoCard
                  key={contactItem.id}
                  contact={contactItem}
                  onUpdate={(id, updates) => updateContact(id, updates)}
                  onDelete={(id) => deleteContact(id)}
                  onEdit={(contact) => setEditingContact(contact)}
                />
              ))
            )}
          </DetailSection>

          {/* Employment */}
          <DetailSection
            title="Employment"
            icon={Briefcase}
            count={employments.length}
            onAdd={() => setAddingEmployment(true)}
          >
            {employments.length === 0 ? (
              <p className="text-sm text-white/50 italic">No employment records</p>
            ) : (
              employments.map((employmentItem) => (
                <EmploymentCard
                  key={employmentItem.id}
                  employment={employmentItem}
                  onUpdate={(id, updates) => updateEmployment(id, updates)}
                  onDelete={(id) => deleteEmployment(id)}
                  onEdit={(employment) => setEditingEmployment(employment)}
                />
              ))
            )}
          </DetailSection>

          {/* Bank Accounts */}
          <DetailSection
            title="Bank Accounts"
            icon={Landmark}
            count={bankAccounts.length}
            onAdd={() => setAddingBankAccount(true)}
          >
            {bankAccounts.length === 0 ? (
              <p className="text-sm text-white/50 italic">No bank accounts</p>
            ) : (
              bankAccounts.map((accountItem) => (
                <BankAccountCard
                  key={accountItem.id}
                  bankAccount={accountItem}
                  onUpdate={(id, updates) => updateBankAccount(id, updates)}
                  onDelete={(id) => deleteBankAccount(id)}
                  onEdit={(bankAccount) => setEditingBankAccount(bankAccount)}
                />
              ))
            )}
          </DetailSection>
        </div>
      </div>

      {/* Modals */}
      {editingPerson && (
        <PersonEditModal
          person={person}
          onSave={(updates: Partial<Person>) => {
            updatePerson(updates);
            setEditingPerson(false);
          }}
          onCancel={() => setEditingPerson(false)}
        />
      )}

      {addingAddress && (
        <AddressFormModal
          personId={personId}
          onSave={(address: Omit<Address, 'id'>) => {
            addAddress(address);
            setAddingAddress(false);
          }}
          onCancel={() => setAddingAddress(false)}
        />
      )}

      {editingAddress && (
        <AddressFormModal
          personId={personId}
          address={editingAddress}
          onSave={(address: Omit<Address, 'id'>) => {
            updateAddress(editingAddress.id, address);
            setEditingAddress(null);
          }}
          onCancel={() => setEditingAddress(null)}
        />
      )}

      {addingContact && (
        <ContactFormModal
          personId={personId}
          onSave={(contact: Omit<ContactInfo, 'id'>) => {
            addContact(contact);
            setAddingContact(false);
          }}
          onCancel={() => setAddingContact(false)}
        />
      )}

      {editingContact && (
        <ContactFormModal
          personId={personId}
          contact={editingContact}
          onSave={(contact: Omit<ContactInfo, 'id'>) => {
            updateContact(editingContact.id, contact);
            setEditingContact(null);
          }}
          onCancel={() => setEditingContact(null)}
        />
      )}

      {addingBankAccount && (
        <BankAccountFormModal
          personId={personId}
          onSave={(account: Omit<BankAccount, 'id'>) => {
            addBankAccount(account);
            setAddingBankAccount(false);
          }}
          onCancel={() => setAddingBankAccount(false)}
        />
      )}

      {editingBankAccount && (
        <BankAccountFormModal
          personId={personId}
          account={editingBankAccount}
          onSave={(account: Omit<BankAccount, 'id'>) => {
            updateBankAccount(editingBankAccount.id, account);
            setEditingBankAccount(null);
          }}
          onCancel={() => setEditingBankAccount(null)}
        />
      )}

      {addingEmployment && (
        <EmploymentFormModal
          personId={personId}
          onSave={(employment: Omit<Employment, 'id'>) => {
            addEmployment(employment);
            setAddingEmployment(false);
          }}
          onCancel={() => setAddingEmployment(false)}
        />
      )}

      {editingEmployment && (
        <EmploymentFormModal
          personId={personId}
          employment={editingEmployment}
          onSave={(employment: Omit<Employment, 'id'>) => {
            updateEmployment(editingEmployment.id, employment);
            setEditingEmployment(null);
          }}
          onCancel={() => setEditingEmployment(null)}
        />
      )}
    </>
  );
};

// Helper Components

interface DetailSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  children: React.ReactNode;
  onAdd?: () => void;
}

const DetailSection = ({ title, icon: Icon, count, children, onAdd }: DetailSectionProps) => (
  <div className="rounded-lg border border-white/20 bg-white/5 overflow-hidden flex flex-col">
    <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-white/5 shrink-0">
      <Icon className="h-4 w-4 text-cyan-400" />
      <h3 className="font-medium text-white">{title}</h3>
      <span className="ml-auto text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full">
        {count}
      </span>
      {onAdd && (
        <button
          onClick={onAdd}
          className="ml-1 p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          title={`Add ${title.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
    <div className="p-3 space-y-2 overflow-y-auto flex-1">{children}</div>
  </div>
);

// Removed unused helper components and utilities
