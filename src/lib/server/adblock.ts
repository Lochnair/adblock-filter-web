import type { InferModel } from 'drizzle-orm';
import { dnsRecords } from './db/schema';

export type DNSRecord = InferModel<typeof dnsRecords>;

export function toFilter(record: DNSRecord): string {
       return `${record.name}$dnsrewrite=NOERROR;${record.type};${record.value}`;
}
