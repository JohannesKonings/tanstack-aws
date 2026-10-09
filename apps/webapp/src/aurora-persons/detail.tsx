import {
  BankIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  MapPinIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  UserIcon,
  XIcon,
} from '@phosphor-icons/react';
import { type ReactNode, useState } from 'react';
import { useAuroraPersonDetailMutations } from '#apps/webapp/aurora-persons/mutations.ts';
import type { readAuroraPersons } from '#apps/webapp/aurora-persons/read.ts';
import { AddressCard } from '#apps/webapp/components/persons/AddressCard';
import { AddressFormModal } from '#apps/webapp/components/persons/AddressFormModal';
import { BankAccountCard } from '#apps/webapp/components/persons/BankAccountCard';
import { BankAccountFormModal } from '#apps/webapp/components/persons/BankAccountFormModal';
import { ContactFormModal } from '#apps/webapp/components/persons/ContactFormModal';
import { ContactInfoCard } from '#apps/webapp/components/persons/ContactInfoCard';
import { EmploymentCard } from '#apps/webapp/components/persons/EmploymentCard';
import { EmploymentFormModal } from '#apps/webapp/components/persons/EmploymentFormModal';
import { PersonEditModal } from '#apps/webapp/components/persons/PersonEditModal';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Card } from '#apps/webapp/components/ui/card';
import { Tabs, TabsList, TabsPanel, TabsTrigger } from '#apps/webapp/components/ui/tabs';
import type { Address, BankAccount, ContactInfo, Employment } from '#apps/webapp/types/person';

type AuroraPersonsSnapshot = Awaited<ReturnType<typeof readAuroraPersons>>;
type AuroraPerson = AuroraPersonsSnapshot['persons'][number];
type AuroraAddress = AuroraPersonsSnapshot['addresses'][number];
type AuroraBankAccount = AuroraPersonsSnapshot['bankAccounts'][number];
type AuroraContact = AuroraPersonsSnapshot['contacts'][number];
type AuroraEmployment = AuroraPersonsSnapshot['employments'][number];

const defined = <T,>(value: T | null): T | undefined => (value === null ? undefined : value);

const toAddress = (address: AuroraAddress): Address => ({
  id: address.id,
  personId: address.personId,
  type: address.type,
  street: address.street,
  city: address.city,
  state: address.state,
  postalCode: address.postalCode,
  country: address.country,
  isPrimary: address.isPrimary,
});

const toContact = (contact: AuroraContact): ContactInfo => ({
  id: contact.id,
  personId: contact.personId,
  type: contact.type,
  value: contact.value,
  isPrimary: contact.isPrimary,
  isVerified: contact.isVerified,
});

const toBankAccount = (bankAccount: AuroraBankAccount): BankAccount => ({
  id: bankAccount.id,
  personId: bankAccount.personId,
  bankName: bankAccount.bankName,
  accountType: bankAccount.accountType,
  accountNumberLast4: bankAccount.accountNumberLast4,
  iban: defined(bankAccount.iban),
  bic: defined(bankAccount.bic),
  isPrimary: bankAccount.isPrimary,
});

const toEmployment = (employment: AuroraEmployment): Employment => ({
  id: employment.id,
  personId: employment.personId,
  companyName: employment.companyName,
  position: employment.position,
  department: defined(employment.department),
  startDate: employment.startDate,
  endDate: employment.endDate,
  isCurrent: employment.isCurrent,
  salary: defined(employment.salary),
  currency: employment.currency,
});

export function AuroraPersonDetail({
  person,
  addresses,
  contacts,
  bankAccounts,
  employments,
  onClose,
}: {
  person: AuroraPerson;
  addresses: AuroraAddress[];
  contacts: AuroraContact[];
  bankAccounts: AuroraBankAccount[];
  employments: AuroraEmployment[];
  onClose: () => void;
}) {
  const {
    updatePerson,
    deletePerson,
    createAddress,
    updateAddress,
    deleteAddress,
    createContact,
    updateContact,
    deleteContact,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    createEmployment,
    updateEmployment,
    deleteEmployment,
  } = useAuroraPersonDetailMutations();
  const [editingPerson, setEditingPerson] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactInfo | null>(null);
  const [addingContact, setAddingContact] = useState(false);
  const [editingBankAccount, setEditingBankAccount] = useState<BankAccount | null>(null);
  const [addingBankAccount, setAddingBankAccount] = useState(false);
  const [editingEmployment, setEditingEmployment] = useState<Employment | null>(null);
  const [addingEmployment, setAddingEmployment] = useState(false);
  const addressRows = addresses.map(toAddress);
  const contactRows = contacts.map(toContact);
  const bankAccountRows = bankAccounts.map(toBankAccount);
  const employmentRows = employments.map(toEmployment);
  const saveFailed =
    updatePerson.isError ||
    deletePerson.isError ||
    createAddress.isError ||
    updateAddress.isError ||
    deleteAddress.isError ||
    createContact.isError ||
    updateContact.isError ||
    deleteContact.isError ||
    createBankAccount.isError ||
    updateBankAccount.isError ||
    deleteBankAccount.isError ||
    createEmployment.isError ||
    updateEmployment.isError ||
    deleteEmployment.isError;

  const handleDeletePerson = () => {
    if (confirm('Are you sure you want to delete this person? This cannot be undone.')) {
      deletePerson.mutate({ id: person.id }, { onSuccess: onClose });
    }
  };

  return (
    <>
      <Card className="overflow-hidden max-h-[calc(100vh-300px)] flex flex-col bg-background-surface/95 backdrop-blur-sm">
        <div className="flex items-center justify-between p-4 border-b border-border-default bg-background-subtle shrink-0">
          <div className="flex items-center gap-3">
            <UserIcon className="h-6 w-6 text-lib-start" />
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {person.firstName} {person.lastName}
              </h2>
              <p className="text-sm text-text-muted">ID: {person.id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="icon"
              color="gray"
              size="icon-md"
              onClick={() => setEditingPerson(true)}
              title="Edit person"
            >
              <PencilSimpleIcon className="h-5 w-5" />
            </Button>
            <Button
              variant="icon"
              color="red"
              size="icon-md"
              onClick={handleDeletePerson}
              title="Delete person"
            >
              <TrashIcon className="h-5 w-5" />
            </Button>
            <Button variant="icon" color="gray" size="icon-md" onClick={onClose} title="Close">
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {saveFailed ? (
            <p className="mb-3 text-ds-terracotta-400" role="alert">
              Aurora persons could not be saved.
            </p>
          ) : null}
          <Tabs defaultValue="addresses" variant="secondary">
            <TabsList aria-label="Person detail sections">
              <TabsTrigger value="addresses" icon={<MapPinIcon className="size-4" />}>
                Addresses
                <Badge variant="default">{addressRows.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="contacts" icon={<EnvelopeIcon className="size-4" />}>
                Contacts
                <Badge variant="default">{contactRows.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="employment" icon={<BriefcaseIcon className="size-4" />}>
                Employment
                <Badge variant="default">{employmentRows.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="banking" icon={<BankIcon className="size-4" />}>
                Banking
                <Badge variant="default">{bankAccountRows.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsPanel value="addresses">
              <DetailSection title="Addresses" onAdd={() => setAddingAddress(true)}>
                {addressRows.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No addresses</p>
                ) : (
                  addressRows.map((address) => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      onDelete={(id) => deleteAddress.mutate({ id })}
                      onEdit={setEditingAddress}
                    />
                  ))
                )}
              </DetailSection>
            </TabsPanel>

            <TabsPanel value="contacts">
              <DetailSection title="Contact Info" onAdd={() => setAddingContact(true)}>
                {contactRows.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No contacts</p>
                ) : (
                  contactRows.map((contact) => (
                    <ContactInfoCard
                      key={contact.id}
                      contact={contact}
                      onDelete={(id) => deleteContact.mutate({ id })}
                      onEdit={setEditingContact}
                    />
                  ))
                )}
              </DetailSection>
            </TabsPanel>

            <TabsPanel value="employment">
              <DetailSection title="Employment" onAdd={() => setAddingEmployment(true)}>
                {employmentRows.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No employment records</p>
                ) : (
                  employmentRows.map((employment) => (
                    <EmploymentCard
                      key={employment.id}
                      employment={employment}
                      onDelete={(id) => deleteEmployment.mutate({ id })}
                      onEdit={setEditingEmployment}
                    />
                  ))
                )}
              </DetailSection>
            </TabsPanel>

            <TabsPanel value="banking">
              <DetailSection title="Bank Accounts" onAdd={() => setAddingBankAccount(true)}>
                {bankAccountRows.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No bank accounts</p>
                ) : (
                  bankAccountRows.map((bankAccount) => (
                    <BankAccountCard
                      key={bankAccount.id}
                      bankAccount={bankAccount}
                      onDelete={(id) => deleteBankAccount.mutate({ id })}
                      onEdit={setEditingBankAccount}
                    />
                  ))
                )}
              </DetailSection>
            </TabsPanel>
          </Tabs>
        </div>
      </Card>

      {editingPerson ? (
        <PersonEditModal
          person={{
            firstName: person.firstName,
            lastName: person.lastName,
            dateOfBirth: defined(person.dateOfBirth),
            gender: defined(person.gender),
          }}
          onSave={(updates) => {
            if (!updates.firstName || !updates.lastName) {
              return;
            }
            updatePerson.mutate(
              {
                id: person.id,
                firstName: updates.firstName,
                lastName: updates.lastName,
                dateOfBirth: updates.dateOfBirth,
                gender: updates.gender,
              },
              { onSuccess: () => setEditingPerson(false) },
            );
          }}
          onCancel={() => setEditingPerson(false)}
        />
      ) : null}

      {addingAddress ? (
        <AddressFormModal
          personId={person.id}
          onSave={(address) => {
            createAddress.mutate(address, { onSuccess: () => setAddingAddress(false) });
          }}
          onCancel={() => setAddingAddress(false)}
        />
      ) : null}

      {editingAddress ? (
        <AddressFormModal
          personId={person.id}
          address={editingAddress}
          onSave={(address) => {
            updateAddress.mutate(
              { ...address, id: editingAddress.id },
              { onSuccess: () => setEditingAddress(null) },
            );
          }}
          onCancel={() => setEditingAddress(null)}
        />
      ) : null}

      {addingContact ? (
        <ContactFormModal
          personId={person.id}
          onSave={(contact) => {
            createContact.mutate(contact, { onSuccess: () => setAddingContact(false) });
          }}
          onCancel={() => setAddingContact(false)}
        />
      ) : null}

      {editingContact ? (
        <ContactFormModal
          personId={person.id}
          contact={editingContact}
          onSave={(contact) => {
            updateContact.mutate(
              { ...contact, id: editingContact.id },
              { onSuccess: () => setEditingContact(null) },
            );
          }}
          onCancel={() => setEditingContact(null)}
        />
      ) : null}

      {addingBankAccount ? (
        <BankAccountFormModal
          personId={person.id}
          onSave={(account) => {
            createBankAccount.mutate(account, { onSuccess: () => setAddingBankAccount(false) });
          }}
          onCancel={() => setAddingBankAccount(false)}
        />
      ) : null}

      {editingBankAccount ? (
        <BankAccountFormModal
          personId={person.id}
          account={editingBankAccount}
          onSave={(account) => {
            updateBankAccount.mutate(
              { ...account, id: editingBankAccount.id },
              { onSuccess: () => setEditingBankAccount(null) },
            );
          }}
          onCancel={() => setEditingBankAccount(null)}
        />
      ) : null}

      {addingEmployment ? (
        <EmploymentFormModal
          personId={person.id}
          onSave={(employment) => {
            createEmployment.mutate(employment, { onSuccess: () => setAddingEmployment(false) });
          }}
          onCancel={() => setAddingEmployment(false)}
        />
      ) : null}

      {editingEmployment ? (
        <EmploymentFormModal
          personId={person.id}
          employment={editingEmployment}
          onSave={(employment) => {
            updateEmployment.mutate(
              { ...employment, id: editingEmployment.id },
              { onSuccess: () => setEditingEmployment(null) },
            );
          }}
          onCancel={() => setEditingEmployment(null)}
        />
      ) : null}
    </>
  );
}

function DetailSection({
  title,
  children,
  onAdd,
}: {
  title: string;
  children: ReactNode;
  onAdd?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-text-primary">{title}</h3>
        {onAdd ? (
          <Button variant="ghost" size="sm" onClick={onAdd} title={`Add ${title.toLowerCase()}`}>
            <PlusIcon className="h-4 w-4" />
            Add
          </Button>
        ) : null}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
