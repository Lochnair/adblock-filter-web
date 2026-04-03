import type { InferSelectModel } from 'drizzle-orm';
import { dnsRecords } from './db/schema';

export type DNSRecord = InferSelectModel<typeof dnsRecords>;

const DNS_RR_TYPES = new Set(['A', 'AAAA', 'CNAME', 'HTTPS', 'SVCB', 'MX', 'PTR', 'SRV', 'TXT']);

export function toFilter(record: DNSRecord): string {
	if (record.type === 'REFUSED') return `${record.name}$dnsrewrite=REFUSED`;
	if (record.type === 'NXDOMAIN') return `${record.name}$dnsrewrite=NXDOMAIN;;`;
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
		const types = new Set<string>(recs.map((r) => r.type).filter((t) => DNS_RR_TYPES.has(t)));
		types.add('SOA');
		// Only emit dnstype exclusion line when actual RR types are present (SOA alone doesn't count)
		if (types.size > 1) {
			const exclusions = Array.from(types)
				.map((t) => `~${t}`)
				.join('|');
			lines.push(`||${name}^$dnstype=${exclusions}`);
		}
	}

	return lines.join('\n');
}
