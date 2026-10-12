/**
 * Resilience Library
 *
 * Circuit breakers, rate limiting, and retry logic for resilient API calls.
 *
 * @module resilience
 */

// Circuit Breaker
export {
  CircuitBreaker,
  type CircuitBreakerConfig,
  CircuitBreakerError,
  type CircuitMetadata,
  CircuitState,
  createCircuitBreaker,
} from "./circuit-breaker";
// Rate Limit Strategies
export {
  type BackoffStrategy,
  ConstantBackoff,
  ExponentialBackoff,
  LinearBackoff,
  retryWithRateLimit,
  withRateLimit,
} from "./rate-limit-strategies";

// Rate Limiting (Token Bucket)
export {
  createRateLimiter,
  type RateLimiterConfig,
  rateLimiters,
  TokenBucketRateLimiter,
} from "./rate-limiter";
// Retry with Exponential Backoff
export {
  createRetryFunction,
  type RetryConfig,
  RetryError,
  type RetryMetadata,
  RetryPresets,
  retryWithBackoff,
  retryWithCircuitBreaker,
  retryWithTimeout,
  sleep,
} from "./retry";

/**
 * Common resilience patterns for API calls
 *
 * @example
 * ```typescript
 * import { CircuitBreaker, retryWithBackoff, RetryPresets } from '@/lib/resilience';
 *
 * // Create circuit breaker
 * const apiCircuit = new CircuitBreaker({
 *   name: 'external-api',
 *   failureThreshold: 3,
 *   successThreshold: 2,
 *   timeout: 30000,
 * });
 *
 * // Use with retry
 * const result = await apiCircuit.execute(async () => {
 *   return retryWithBackoff(
 *     () => fetch('https://api.example.com/data'),
 *     RetryPresets.STANDARD
 *   );
 * });
 * ```
 *
 * @example
 * ```typescript
 * import { rateLimiters, withRateLimit } from '@/lib/resilience';
 *
 * // Rate limit Reddit API calls
 * async function fetchRedditPosts(subreddit: string) {
 *   await rateLimiters.reddit.acquire(1);
 *   return fetch(`https://reddit.com/r/${subreddit}/top.json`);
 * }
 *
 * // Or use decorator
 * const rateLimitedFetch = withRateLimit(
 *   async (url: string) => fetch(url).then(r => r.json()),
 *   rateLimiters.reddit
 * );
 * ```
 */
