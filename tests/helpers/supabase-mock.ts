import { vi } from 'vitest';

export type QueryResponse<T = any> = {
  data?: T;
  error?: any;
};

export type QueryPlanEntry = {
  table: string;
  response: QueryResponse;
};

type Chain = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  ilike: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upload: ReturnType<typeof vi.fn>;
  createSignedUrl: ReturnType<typeof vi.fn>;
  then: (resolve: (value: QueryResponse) => void, reject?: (reason?: unknown) => void) => Promise<void>;
};

function normalizeResponse(input?: QueryResponse): QueryResponse {
  return {
    data: input?.data ?? null,
    error: input?.error ?? null
  };
}

export function createQueryChain(response?: QueryResponse): Chain {
  const normalized = normalizeResponse(response);
  const chain = {} as Chain;

  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.limit = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => normalized);
  chain.single = vi.fn(async () => normalized);
  chain.in = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.ilike = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.update = vi.fn(() => chain);
  chain.upload = vi.fn(async () => normalized);
  chain.createSignedUrl = vi.fn(async () => normalized);
  chain.then = (resolve, reject) => Promise.resolve(normalized).then(resolve, reject);

  return chain;
}

export function createSupabaseMock(plan: QueryPlanEntry[]) {
  const queues = new Map<string, QueryResponse[]>();
  const history: Array<{ table: string; chain: Chain }> = [];

  plan.forEach((entry) => {
    const existing = queues.get(entry.table) ?? [];
    existing.push(normalizeResponse(entry.response));
    queues.set(entry.table, existing);
  });

  const from = vi.fn((table: string) => {
    const queue = queues.get(table) ?? [];

    if (!queue.length) {
      throw new Error(`No mock response queued for table "${table}".`);
    }

    const response = queue.shift();
    queues.set(table, queue);

    const chain = createQueryChain(response);
    history.push({ table, chain });

    return chain;
  });

  const storageChain = createQueryChain();
  const storageFrom = vi.fn(() => storageChain);

  const supabase = {
    from,
    auth: {
      getUser: vi.fn(async () => ({ data: { user: null } })),
      signOut: vi.fn(async () => ({ error: null })),
      signInWithOAuth: vi.fn(async () => ({ data: { url: 'https://example.com/oauth' }, error: null })),
      exchangeCodeForSession: vi.fn(async () => ({ error: null }))
    },
    storage: {
      from: storageFrom
    }
  };

  return {
    supabase,
    from,
    history,
    storageFrom,
    storageChain
  };
}
