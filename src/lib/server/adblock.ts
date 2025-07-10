import type { InferSelectModel } from 'drizzle-orm';
import { dnsRecords } from './db/schema';

export type DNSRecord = InferSelectModel<typeof dnsRecords>;

export function toFilter(record: DNSRecord): string {
	return `${record.name}$dnsrewrite=NOERROR;${record.type};${record.value}`;
}

export function generateFilter(records: DNSRecord[]): string {
	const groups = new Map<string, DNSRecord[]>();
	for (const record of records) {
		const arr = groups.get(record.name);
		if (arr) arr.push(record);
		else groups.set(record.name, [record]);
	}

	const lines: string[] = [];

	for (const [name, recs] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
		for (const r of recs) {
			lines.push(toFilter(r));
		}
		const types = new Set<string>(recs.map((r) => r.type));
		types.add('SOA');
		const exclusions = Array.from(types)
			.map((t) => `~${t}`)
			.join('|');
		lines.push(`||${name}^$dnstype=${exclusions}`);
	}

	return lines.join('\n');
}
