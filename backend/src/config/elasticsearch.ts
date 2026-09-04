import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const esNode = process.env.ELASTICSEARCH_NODE || 'http://localhost:9200';
export const ES_INDEX_NAME = process.env.ELASTICSEARCH_INDEX || 'emails';

export const esClient = new Client({
  node: esNode,
  requestTimeout: 4000,
  maxRetries: 2,
});

let isEsAvailable = false;

export async function initElasticsearch(): Promise<boolean> {
  try {
    const health = await esClient.ping();
    if (health) {
      isEsAvailable = true;
      console.log(`✅ Elasticsearch connected successfully at ${esNode}`);

      // Verify or create index
      const indexExists = await esClient.indices.exists({ index: ES_INDEX_NAME });
      if (!indexExists) {
        await esClient.indices.create({
          index: ES_INDEX_NAME,
          body: {
            mappings: {
              properties: {
                id: { type: 'keyword' },
                userId: { type: 'keyword' },
                recipient: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                sender: { type: 'text', fields: { keyword: { type: 'keyword' } } },
                subject: { type: 'text' },
                body: { type: 'text' },
                status: { type: 'keyword' },
                scheduledAt: { type: 'date' },
                sentAt: { type: 'date' },
                createdAt: { type: 'date' },
              },
            },
          },
        });
        console.log(`📁 Created Elasticsearch index '${ES_INDEX_NAME}'`);
      }
      return true;
    }
  } catch (error: any) {
    isEsAvailable = false;
    console.warn(
      `⚠️ Elasticsearch not reachable at ${esNode} (${error.message}). Full-text search will use database fallback.`
    );
  }
  return false;
}

export function isElasticsearchReady(): boolean {
  return isEsAvailable;
}
