import type { InferModel } from 'drizzle-orm';
import { dnsRecords } from './db/schema';

export type DNSRecord = InferModel<typeof dnsRecords>;

export function toFilter(record: DNSRecord): string {
	return `${record.name}$dnsrewrite=NOERROR;${record.type};${record.value}`;
}

export function generateFilter(records: DNSRecord[]): string {
	const groups = new Map<string, DNSRecord[]>();
	for (const record of records) {
		const arr = groups.get(record.name) ?? [];
		arr.push(record);
		groups.set(record.name, arr);
	}

	const lines: string[] = [];

	for (const [name, recs] of groups) {
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
