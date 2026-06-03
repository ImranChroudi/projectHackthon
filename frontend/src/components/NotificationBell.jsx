import { Bell, CheckCheck } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { fromNow } from '@/lib/format';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/queries';
import { cn } from '@/lib/utils';

export function NotificationBell() {
  const { data } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();

  const items = data?.items || [];
  const nonLues = data?.nonLues || 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {nonLues > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {nonLues > 9 ? '9+' : nonLues}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">Notifications</span>
          {nonLues > 0 && (
            <button
              onClick={() => markAll.mutate()}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Tout marquer comme lu
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification.</p>
          ) : (
            items.map((n) => (
              <button
                key={n._id}
                onClick={() => !n.lu && markOne.mutate(n._id)}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 border-b px-4 py-3 text-left transition-colors hover:bg-muted/60',
                  !n.lu && 'bg-accent/40'
                )}
              >
                <span className="text-sm leading-snug">{n.message}</span>
                <span className="text-xs text-muted-foreground">{fromNow(n.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
