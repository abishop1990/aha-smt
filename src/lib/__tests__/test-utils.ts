import { NextRequest } from "next/server";
import type { AhaFeature, AhaRelease, AhaUser, AhaWorkflowStatus } from "@/lib/aha-types";

/**
 * Sets process.env with test defaults for environment variables
 */
export function mockEnv(overrides?: Partial<Record<string, string>>): void {
  process.env.AHA_DOMAIN = "test-domain";
  process.env.AHA_API_TOKEN = "test-token";
  process.env.AHA_DEFAULT_PRODUCT_ID = "test-product";
  process.env.DATABASE_URL = "file:./data/test.db";
  process.env.CACHE_TTL_SECONDS = "60";

  if (overrides) {
    Object.assign(process.env, overrides);
  }
}

interface MockRequestOptions {
  method?: string;
  body?: unknown;
  searchParams?: Record<string, string>;
}

/**
 * Creates a mock NextRequest with optional configuration
 */
export function createMockNextRequest(url: string, options?: MockRequestOptions): NextRequest {
  const { method = "GET", body, searchParams } = options ?? {};

  const fullUrl = new URL(url, "http://localhost:3000");
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      fullUrl.searchParams.set(key, value);
    });
  }

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (body) {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(fullUrl, requestInit);
}

/**
 * Creates a mock AhaFeature object with test defaults
 */
export function createMockFeature(overrides?: Partial<AhaFeature>): AhaFeature {
  const defaultFeature: AhaFeature = {
    id: "test-feature-id",
    reference_num: "FEAT-123",
    name: "Test Feature",
    score: null,
    workflow_status: {
      id: "status-1",
      name: "Ready to develop",
      color: "#4a90e2",
      position: 1,
      complete: false,
    },
    assigned_to_user: {
      id: "user-1",
      name: "Test User",
      email: "test@example.com",
      avatar_url: "https://example.com/avatar.png",
    },
    tags: ["tag1", "tag2"],
    position: 1,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-02T00:00:00Z",
    description: { body: "Test feature description" },
    requirements: [
      { id: "req-1", name: "Requirement 1", body: "Requirement 1 body" },
    ],
    release: {
      id: "release-1",
      reference_num: "REL-1",
      name: "Release 1",
    },
  };

  return { ...defaultFeature, ...overrides };
}

/**
 * Creates a mock AhaRelease object with test defaults
 */
export function createMockRelease(overrides?: Partial<AhaRelease>): AhaRelease {
  const defaultRelease: AhaRelease = {
    id: "test-release-id",
    reference_num: "REL-123",
    name: "Test Release",
    start_date: "2025-01-01",
    release_date: "2025-12-31",
    progress: 50,
    parking_lot: false,
    project: {
      id: "project-1",
      name: "Test Project",
    },
  };

  return { ...defaultRelease, ...overrides };
}
