// Token bucket rate limiter: 20 req/sec burst, 300 req/min sustained
const BURST_LIMIT = 20;
const SUSTAINED_LIMIT = 300;
const BURST_WINDOW_MS = 1000;
const SUSTAINED_WINDOW_MS = 60000;

let burstTokens = BURST_LIMIT;
let sustainedTokens = SUSTAINED_LIMIT;
let lastBurstRefill = Date.now();
let lastSustainedRefill = Date.now();

const queue: Array<{
  resolve: () => void;
}> = [];

function refillTokens() {
  const now = Date.now();

  const burstElapsed = now - lastBurstRefill;
  if (burstElapsed >= BURST_WINDOW_MS) {
    const refills = Math.floor(burstElapsed / BURST_WINDOW_MS);
    burstTokens = Math.min(BURST_LIMIT, burstTokens + refills * BURST_LIMIT);
    lastBurstRefill = now;
  }

  const sustainedElapsed = now - lastSustainedRefill;
  if (sustainedElapsed >= SUSTAINED_WINDOW_MS) {
    const refills = Math.floor(sustainedElapsed / SUSTAINED_WINDOW_MS);
    sustainedTokens = Math.min(SUSTAINED_LIMIT, sustainedTokens + refills * SUSTAINED_LIMIT);
    lastSustainedRefill = now;
  }
}

function processQueue() {
  refillTokens();
  while (queue.length > 0 && burstTokens > 0 && sustainedTokens > 0) {
    burstTokens--;
    sustainedTokens--;
    const item = queue.shift();
    item?.resolve();
  }
  if (queue.length > 0) {
    setTimeout(processQueue, 100);
  }
}

/** @internal Reset rate limiter state for testing */
export function __resetRateLimiter(): void {
  burstTokens = BURST_LIMIT;
  sustainedTokens = SUSTAINED_LIMIT;
  lastBurstRefill = Date.now();
  lastSustainedRefill = Date.now();
  queue.length = 0;
}

export async function rateLimitedFetch(): Promise<void> {
  refillTokens();

  if (burstTokens > 0 && sustainedTokens > 0) {
    burstTokens--;
    sustainedTokens--;
    return;
  }

  return new Promise<void>((resolve) => {
    queue.push({ resolve });
    setTimeout(processQueue, 100);
  });
}
