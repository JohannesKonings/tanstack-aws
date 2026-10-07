import { createFileRoute } from '@tanstack/react-router';
import { useStore } from '@tanstack/react-store';
import { Badge } from '#src/webapp/components/ui/badge';
import { Card } from '#src/webapp/components/ui/card';
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
    <input
      type="text"
      value={firstName}
      onChange={(e) =>
        store.setState((state: { firstName: string; lastName: string }) => ({
          ...state,
          firstName: e.target.value,
        }))
      }
      className="bg-white/10 rounded-lg px-4 py-2 outline-none border border-white/20 hover:border-white/40 focus:border-white/60 transition-colors duration-200 placeholder-white/40"
    />
  );
}

function LastName() {
  const lastName = useStore(
    store,
    (state: { firstName: string; lastName: string }) => state.lastName,
  );
  return (
    <input
      type="text"
      value={lastName}
      onChange={(e) =>
        store.setState((state: { firstName: string; lastName: string }) => ({
          ...state,
          lastName: e.target.value,
        }))
      }
      className="bg-white/10 rounded-lg px-4 py-2 outline-none border border-white/20 hover:border-white/40 focus:border-white/60 transition-colors duration-200 placeholder-white/40"
    />
  );
}

function FullName() {
  const fName = useStore(fullName, (state: string) => state);
  return <div className="bg-white/10 rounded-lg px-4 py-2 outline-none ">{fName}</div>;
}

function DemoStore() {
  return (
    <div
      className="min-h-[calc(100vh-32px)] text-text-primary p-8 flex items-center justify-center w-full h-full bg-background-default"
      style={{
        backgroundImage:
          'radial-gradient(50% 50% at 80% 80%, #f4a460 0%, #8b4513 70%, #1a0f0a 100%)',
      }}
    >
      <Card className="w-full max-w-2xl p-8 bg-background-surface/95 backdrop-blur-lg">
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
