import {
  BankIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  MapPinIcon,
  UserIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { readAuroraPersons } from '#apps/webapp/aurora-persons/read.ts';
import { AddressCard } from '#apps/webapp/components/persons/AddressCard';
import { BankAccountCard } from '#apps/webapp/components/persons/BankAccountCard';
import { ContactInfoCard } from '#apps/webapp/components/persons/ContactInfoCard';
import { EmploymentCard } from '#apps/webapp/components/persons/EmploymentCard';
import { Badge } from '#apps/webapp/components/ui/badge';
import { Button } from '#apps/webapp/components/ui/button';
import { Card } from '#apps/webapp/components/ui/card';
import { Tabs, TabsList, TabsPanel, TabsTrigger } from '#apps/webapp/components/ui/tabs';

type AuroraPersonsSnapshot = Awaited<ReturnType<typeof readAuroraPersons>>;
type AuroraPerson = AuroraPersonsSnapshot['persons'][number];
type AuroraAddress = AuroraPersonsSnapshot['addresses'][number];
type AuroraBankAccount = AuroraPersonsSnapshot['bankAccounts'][number];
type AuroraContact = AuroraPersonsSnapshot['contacts'][number];
type AuroraEmployment = AuroraPersonsSnapshot['employments'][number];

const defined = <T,>(value: T | null): T | undefined => (value === null ? undefined : value);

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
  return (
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
        <Button variant="icon" color="gray" size="icon-md" onClick={onClose} title="Close">
          <XIcon className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        <Tabs defaultValue="addresses" variant="secondary">
          <TabsList aria-label="Person detail sections">
            <TabsTrigger value="addresses" icon={<MapPinIcon className="size-4" />}>
              Addresses
              <Badge variant="default">{addresses.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="contacts" icon={<EnvelopeIcon className="size-4" />}>
              Contacts
              <Badge variant="default">{contacts.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="employment" icon={<BriefcaseIcon className="size-4" />}>
              Employment
              <Badge variant="default">{employments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="banking" icon={<BankIcon className="size-4" />}>
              Banking
              <Badge variant="default">{bankAccounts.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsPanel value="addresses">
            <DetailSection title="Addresses">
              {addresses.length === 0 ? (
                <p className="text-sm text-text-muted italic">No addresses</p>
              ) : (
                addresses.map((address) => (
                  <AddressCard
                    key={address.id}
                    address={{
                      id: address.id,
                      personId: address.personId,
                      type: address.type,
                      street: address.street,
                      city: address.city,
                      state: address.state,
                      postalCode: address.postalCode,
                      country: address.country,
                      isPrimary: address.isPrimary,
                    }}
                  />
                ))
              )}
            </DetailSection>
          </TabsPanel>

          <TabsPanel value="contacts">
            <DetailSection title="Contact Info">
              {contacts.length === 0 ? (
                <p className="text-sm text-text-muted italic">No contacts</p>
              ) : (
                contacts.map((contact) => (
                  <ContactInfoCard
                    key={contact.id}
                    contact={{
                      id: contact.id,
                      personId: contact.personId,
                      type: contact.type,
                      value: contact.value,
                      isPrimary: contact.isPrimary,
                      isVerified: contact.isVerified,
                    }}
                  />
                ))
              )}
            </DetailSection>
          </TabsPanel>

          <TabsPanel value="employment">
            <DetailSection title="Employment">
              {employments.length === 0 ? (
                <p className="text-sm text-text-muted italic">No employment records</p>
              ) : (
                employments.map((employment) => (
                  <EmploymentCard
                    key={employment.id}
                    employment={{
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
                    }}
                  />
                ))
              )}
            </DetailSection>
          </TabsPanel>

          <TabsPanel value="banking">
            <DetailSection title="Bank Accounts">
              {bankAccounts.length === 0 ? (
                <p className="text-sm text-text-muted italic">No bank accounts</p>
              ) : (
                bankAccounts.map((bankAccount) => (
                  <BankAccountCard
                    key={bankAccount.id}
                    bankAccount={{
                      id: bankAccount.id,
                      personId: bankAccount.personId,
                      bankName: bankAccount.bankName,
                      accountType: bankAccount.accountType,
                      accountNumberLast4: bankAccount.accountNumberLast4,
                      iban: defined(bankAccount.iban),
                      bic: defined(bankAccount.bic),
                      isPrimary: bankAccount.isPrimary,
                    }}
                  />
                ))
              )}
            </DetailSection>
          </TabsPanel>
        </Tabs>
      </div>
    </Card>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="font-medium text-text-primary">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
