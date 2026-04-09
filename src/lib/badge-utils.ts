const TYPE_BADGE_CLASSES: Record<string, string> = {
	A: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
	AAAA: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
	CNAME: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
	PTR: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
	MX: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
	SRV: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
	HTTPS: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
	SVCB: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
	TXT: 'bg-muted text-muted-foreground',
	NXDOMAIN: 'bg-destructive/10 text-destructive',
	REFUSED: 'bg-destructive/10 text-destructive'
};

export function typeBadgeClass(type: string): string {
	return TYPE_BADGE_CLASSES[type] ?? 'bg-muted text-muted-foreground';
}
