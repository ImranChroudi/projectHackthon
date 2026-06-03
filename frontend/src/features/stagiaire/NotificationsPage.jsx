import { Bell, CheckCheck } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fromNow } from '@/lib/format';
import { useNotifications, useMarkAllNotificationsRead, useMarkNotificationRead } from '@/hooks/queries';
import { cn } from '@/lib/utils';

export function NotificationsPage() {
  const { data } = useNotifications();
  const markAll = useMarkAllNotificationsRead();
  const markOne = useMarkNotificationRead();
  const items = data?.items || [];

  return (
    <div>
      <PageHeader title="Notifications" description="Vos alertes et messages.">
        {(data?.nonLues || 0) > 0 && (
          <Button variant="outline" onClick={() => markAll.mutate()}>
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </Button>
        )}
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Bell} title="Aucune notification" />
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n._id}
                  className={cn('flex items-start justify-between gap-3 px-5 py-4', !n.lu && 'bg-accent/30')}
                >
                  <div>
                    <p className="text-sm">{n.message}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{fromNow(n.createdAt)}</p>
                  </div>
                  {!n.lu && (
                    <Button size="sm" variant="ghost" onClick={() => markOne.mutate(n._id)}>
                      Marquer lu
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
