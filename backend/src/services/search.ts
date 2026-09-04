import { esClient, ES_INDEX_NAME, isElasticsearchReady } from '../config/elasticsearch';
import prisma from '../config/db';

export interface EmailSearchDoc {
  id: string;
  userId?: string | null;
  recipient: string;
  sender: string;
  subject: string;
  body: string;
  status: string;
  scheduledAt: string | Date;
  sentAt?: string | Date | null;
  createdAt: string | Date;
}

export class SearchService {
  /**
   * Indexes a newly created email job into Elasticsearch.
   */
  public static async indexEmail(doc: EmailSearchDoc): Promise<void> {
    if (!isElasticsearchReady()) {
      return;
    }
    try {
      await esClient.index({
        index: ES_INDEX_NAME,
        id: doc.id,
        document: {
          id: doc.id,
          userId: doc.userId,
          recipient: doc.recipient,
          sender: doc.sender,
          subject: doc.subject,
          body: doc.body,
          status: doc.status,
          scheduledAt: new Date(doc.scheduledAt).toISOString(),
          sentAt: doc.sentAt ? new Date(doc.sentAt).toISOString() : null,
          createdAt: new Date(doc.createdAt).toISOString(),
        },
      });
    } catch (error: any) {
      console.warn(`⚠️ Elasticsearch indexing failed for email ${doc.id}:`, error.message);
    }
  }

  /**
   * Updates an existing email document in Elasticsearch (e.g. status change, sentAt).
   */
  public static async updateEmail(
    id: string,
    updates: Partial<EmailSearchDoc>
  ): Promise<void> {
    if (!isElasticsearchReady()) {
      return;
    }
    try {
      await esClient.update({
        index: ES_INDEX_NAME,
        id,
        doc: updates,
        doc_as_upsert: true,
      });
    } catch (error: any) {
      console.warn(`⚠️ Elasticsearch update failed for email ${id}:`, error.message);
    }
  }

  /**
   * Searches sent and scheduled emails via Elasticsearch with automatic database fallback.
   */
  public static async searchEmails(
    queryText: string,
    filters?: { status?: string; sender?: string },
    page: number = 1,
    limit: number = 20
  ): Promise<{ results: any[]; total: number; source: 'elasticsearch' | 'database' }> {
    const trimmed = queryText ? queryText.trim() : '';

    if (isElasticsearchReady() && trimmed) {
      try {
        const mustClauses: any[] = [
          {
            multi_match: {
              query: trimmed,
              fields: ['subject^3', 'recipient^2', 'body', 'sender'],
              fuzziness: 'AUTO',
            },
          },
        ];

        if (filters?.status) {
          mustClauses.push({ term: { status: filters.status } });
        }
        if (filters?.sender) {
          mustClauses.push({ term: { 'sender.keyword': filters.sender } });
        }

        const from = (page - 1) * limit;
        const response = await esClient.search({
          index: ES_INDEX_NAME,
          from,
          size: limit,
          query: {
            bool: {
              must: mustClauses,
            },
          },
        });

        const hits = response.hits.hits.map((hit) => hit._source);
        const total =
          typeof response.hits.total === 'number'
            ? response.hits.total
            : response.hits.total?.value || 0;

        return { results: hits, total, source: 'elasticsearch' };
      } catch (error: any) {
        console.warn('⚠️ Elasticsearch search error, falling back to database:', error.message);
      }
    }

    // Graceful Database Fallback
    const where: any = {};
    if (trimmed) {
      where.OR = [
        { subject: { contains: trimmed, mode: 'insensitive' } },
        { recipient: { contains: trimmed, mode: 'insensitive' } },
        { sender: { contains: trimmed, mode: 'insensitive' } },
        { body: { contains: trimmed, mode: 'insensitive' } },
      ];
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.sender) {
      where.sender = filters.sender;
    }

    const [results, total] = await Promise.all([
      prisma.emailJob.findMany({
        where,
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.emailJob.count({ where }),
    ]);

    return { results, total, source: 'database' };
  }
}

export default SearchService;
