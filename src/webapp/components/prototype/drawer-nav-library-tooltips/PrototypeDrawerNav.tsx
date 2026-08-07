/**
 * PROTOTYPE host — swaps drawer nav variants for library icon+name experiments.
 * Question: does libraries-card icon+name feel right in this drawer before the adoption spec?
 */
import {
  DrawerNavProtoProvider,
  PrototypeNavSwitcher,
  useDrawerNavProtoVariant,
} from './PrototypeNavSwitcher';
import { VariantA } from './VariantA';
import { VariantB } from './VariantB';
import { VariantC } from './VariantC';

type Props = { onNavigate: () => void };

function PrototypeDrawerNavInner({ onNavigate }: Props) {
  const variant = useDrawerNavProtoVariant();

  return (
    <>
      {variant === 'A' ? <VariantA onNavigate={onNavigate} /> : null}
      {variant === 'B' ? <VariantB onNavigate={onNavigate} /> : null}
      {variant === 'C' ? <VariantC onNavigate={onNavigate} /> : null}
      <PrototypeNavSwitcher />
    </>
  );
}

export function PrototypeDrawerNav({ onNavigate }: Props) {
  return (
    <DrawerNavProtoProvider>
      <PrototypeDrawerNavInner onNavigate={onNavigate} />
    </DrawerNavProtoProvider>
  );
}
