'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import type { LucideIcon } from 'lucide-react';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AppSidebarProps = {
  open: boolean;
  onToggle: () => void;
  navItems: NavItem[];
  userEmail?: string | null;
};

export function AppSidebar({ open, onToggle, navItems, userEmail }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 shadow-2xl transition-all duration-300',
        open ? 'w-72' : 'w-24'
      )}
    >
      <div className="px-4 pb-5 pt-6">
        <div className={cn('flex items-center', open ? 'justify-between' : 'justify-center')}>
          <div
            className={cn(
              'flex items-center overflow-hidden transition-all duration-300',
              open ? 'flex-1 pr-3 opacity-100' : 'w-0 opacity-0'
            )}
          >
            <Image
              src="/logo.png"
              alt="OpenCoders logo"
              width={220}
              height={46}
              className="h-auto w-full object-contain"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              'h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white',
              !open && 'mx-auto'
            )}
          >
            {open ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const routeDepth = item.href.split('/').filter(Boolean).length;
          const isTopLevelRoute = routeDepth === 1;
          const isActive = isTopLevelRoute
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group relative flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-cyan-500/15 text-cyan-100 ring-1 ring-cyan-400/40'
                  : 'text-slate-300 hover:bg-white/8 hover:text-white'
              )}
            >
              <span
                className={cn(
                  'grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors',
                  isActive ? 'bg-cyan-400/20 text-cyan-100' : 'bg-white/5 text-slate-300 group-hover:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              {open && <span className="ml-3 truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-white/10 px-4 py-4">
        {open && <p className="mb-3 truncate text-xs text-slate-400">{userEmail}</p>}
        <Button
          onClick={() => signOut({ callbackUrl: '/login' })}
          variant="outline"
          className={cn(
            'w-full border-red-400/30 bg-red-500/10 text-red-100 hover:border-red-300/60 hover:bg-red-500/20 hover:text-red-50',
            !open && 'px-0'
          )}
        >
          <LogOut className={cn('h-4 w-4', open && 'mr-2')} />
          {open ? 'Logout' : null}
        </Button>
      </div>
    </aside>
  );
}
