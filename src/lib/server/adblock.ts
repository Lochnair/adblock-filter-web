import type { InferSelectModel } from 'drizzle-orm';
import { dnsRecords } from './db/schema';
import { DNS_RR_TYPES } from '$lib/record-types';

export type DNSRecord = InferSelectModel<typeof dnsRecords>;

const DNS_RR_TYPES_SET = new Set<string>(DNS_RR_TYPES);

export function toFilter(record: DNSRecord): string {
	if (record.type === 'REFUSED') {
		return record.value
			? `||${record.name}^$dnstype=${record.value},dnsrewrite=REFUSED`
			: `${record.name}$dnsrewrite=REFUSED`;
	}
	if (record.type === 'NXDOMAIN') {
		return record.value
			? `||${record.name}^$dnstype=${record.value},dnsrewrite=NXDOMAIN;;`
			: `${record.name}$dnsrewrite=NXDOMAIN;;`;
	}
	// Empty value on an RR type = NODATA (NOERROR with empty answer) for that query type
	if (!record.value) {
		return `||${record.name}^$dnstype=${record.type},dnsrewrite=NOERROR;;`;
	}
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
		// Build the set of query types explicitly handled by records in this group.
		// Both real-value and NODATA (empty-value) RR type records count — they all
		// generate explicit dnsrewrite rules that intercept those query types.
		// Scoped NXDOMAIN/REFUSED values also cover their target type.
		const types = new Set<string>(recs.map((r) => r.type).filter((t) => DNS_RR_TYPES_SET.has(t)));
		for (const r of recs) {
			if ((r.type === 'NXDOMAIN' || r.type === 'REFUSED') && r.value) {
				types.add(r.value);
			}
		}
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
