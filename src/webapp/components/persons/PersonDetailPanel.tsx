// oxlint-disable no-ternary
// oxlint-disable no-magic-numbers
// oxlint-disable id-length
// oxlint-disable max-statements
import { Briefcase, Edit2, Landmark, Mail, MapPin, Plus, Trash2, User, X } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '#src/webapp/components/ui/badge';
import { Card } from '#src/webapp/components/ui/card';
import { Tabs, TabsList, TabsPanel, TabsTrigger } from '#src/webapp/components/ui/tabs';
import { usePersonDetail } from '#src/webapp/hooks/useDbPersons';
import type {
  Address,
  BankAccount,
  ContactInfo,
  Employment,
  Person,
} from '#src/webapp/types/person';
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
      <Card className="p-6 bg-background-surface/90 backdrop-blur-sm">
        <div className="animate-pulse text-text-secondary">Loading person details...</div>
      </Card>
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
      <Card className="overflow-hidden max-h-[calc(100vh-300px)] flex flex-col bg-background-surface/95 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-background-subtle shrink-0">
          <div className="flex items-center gap-3">
            <User className="h-6 w-6 text-lib-start" />
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {person.firstName} {person.lastName}
              </h2>
              <p className="text-sm text-text-muted">ID: {person.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditingPerson(true)}
              className="p-2 rounded-lg hover:bg-surface-state-hover text-text-secondary hover:text-text-primary transition-colors"
              title="Edit person"
            >
              <Edit2 className="h-5 w-5" />
            </button>
            <button
              onClick={handleDeletePerson}
              className="p-2 rounded-lg hover:bg-status-error-bg text-text-secondary hover:text-text-error transition-colors"
              title="Delete person"
            >
              <Trash2 className="h-5 w-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-state-hover text-text-secondary hover:text-text-primary transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <Tabs defaultValue="addresses" variant="secondary">
            <TabsList aria-label="Person detail sections">
              <TabsTrigger value="addresses" icon={<MapPin className="size-4" />}>
                Addresses
                <Badge variant="default">{addresses.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="contacts" icon={<Mail className="size-4" />}>
                Contacts
                <Badge variant="default">{contacts.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="employment" icon={<Briefcase className="size-4" />}>
                Employment
                <Badge variant="default">{employments.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="banking" icon={<Landmark className="size-4" />}>
                Banking
                <Badge variant="default">{bankAccounts.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsPanel value="addresses">
              <DetailSection title="Addresses" onAdd={() => setAddingAddress(true)}>
                {addresses.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No addresses</p>
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
            </TabsPanel>

            <TabsPanel value="contacts">
              <DetailSection title="Contact Info" onAdd={() => setAddingContact(true)}>
                {contacts.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No contacts</p>
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
            </TabsPanel>

            <TabsPanel value="employment">
              <DetailSection title="Employment" onAdd={() => setAddingEmployment(true)}>
                {employments.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No employment records</p>
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
            </TabsPanel>

            <TabsPanel value="banking">
              <DetailSection title="Bank Accounts" onAdd={() => setAddingBankAccount(true)}>
                {bankAccounts.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No bank accounts</p>
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
            </TabsPanel>
          </Tabs>
        </div>
      </Card>

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

interface DetailSectionProps {
  title: string;
  children: React.ReactNode;
  onAdd?: () => void;
}

const DetailSection = ({ title, children, onAdd }: DetailSectionProps) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h3 className="font-medium text-text-primary">{title}</h3>
      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-text-secondary hover:bg-action-secondary hover:text-text-primary transition-colors"
          title={`Add ${title.toLowerCase()}`}
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      )}
    </div>
    <div className="space-y-2">{children}</div>
  </div>
);
