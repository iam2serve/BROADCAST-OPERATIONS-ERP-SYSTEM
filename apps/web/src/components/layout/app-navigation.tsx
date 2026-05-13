import Link from 'next/link';

import { filterNavigation, navigationItems } from '@/src/lib/navigation';

type AppNavigationProps = {
  permissions: readonly string[];
};

export function AppNavigation({ permissions }: AppNavigationProps) {
  const visibleItems = filterNavigation(navigationItems, permissions);

  return (
    <nav className="flex h-full w-64 shrink-0 flex-col border-r border-border bg-background px-4 py-5">
      <div className="mb-6">
        <p className="text-sm font-semibold text-primary">Broadcast ERP</p>
      </div>
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <Link
            className="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
