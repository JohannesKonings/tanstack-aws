import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { Badge } from '#src/webapp/components/ui/badge';
import { Card } from '#src/webapp/components/ui/card';
import { Input } from '#src/webapp/components/ui/input';
import { Tabs, TabsList, TabsPanel, TabsTrigger } from '#src/webapp/components/ui/tabs';
import { fullName, store } from '#src/webapp/lib/demo-store';

export const Route = createFileRoute('/demo/store')({
  component: DemoStore,
});

function FirstName() {
  const firstName = useStore(
    store,
    (state: { firstName: string; lastName: string }) => state.firstName,
  );
  return (
    <Input
      type="text"
      value={firstName}
      onChange={(e) =>
        store.setState((state: { firstName: string; lastName: string }) => ({
          ...state,
          firstName: e.target.value,
        }))
      }
    />
  );
}

function LastName() {
  const lastName = useStore(
    store,
    (state: { firstName: string; lastName: string }) => state.lastName,
  );
  return (
    <Input
      type="text"
      value={lastName}
      onChange={(e) =>
        store.setState((state: { firstName: string; lastName: string }) => ({
          ...state,
          lastName: e.target.value,
        }))
      }
    />
  );
}

function FullName() {
  const fName = useStore(fullName, (state: string) => state);
  return (
    <div className="rounded-lg border border-border-default bg-background-subtle px-3 py-2 text-text-primary">
      {fName}
    </div>
  );
}

function DemoStore() {
  return (
    <div
      className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-background-default p-8 text-text-primary"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 80% 80%, #f4a460 0%, #8b4513 70%, #1a0f0a 100%)',
      }}
    >
      <Card className="w-full max-w-2xl p-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-4xl font-bold">Store Example</h1>
          <Badge variant="info">TanStack Store</Badge>
        </div>

        <Tabs defaultValue="editor" variant="primary">
          <TabsList aria-label="Store demo views">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsPanel value="editor" className="space-y-4 text-2xl">
            <FirstName />
            <LastName />
          </TabsPanel>

          <TabsPanel value="preview">
            <p className="mb-3 text-sm text-text-secondary">Live derived full name</p>
            <FullName />
          </TabsPanel>
        </Tabs>
      </Card>
    </div>
  );
}
