import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";

// Mock the db module
let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

import { GET, POST } from "../route";

describe("GET /api/standups", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("should return empty array initially", async () => {
    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.entries).toEqual([]);
  });

  it("should return standups after creation", async () => {
    const standupData = {
      userId: "user-123",
      userName: "John Doe",
      standupDate: "2024-01-15",
      doneSinceLastStandup: "Completed feature X",
      workingOnNow: "Working on feature Y",
      blockers: "None",
      actionItems: "Review PR",
      featureRefs: ["FEAT-1", "FEAT-2"],
    };

    const postRequest = new NextRequest(
      new URL("http://localhost:3000/api/standups"),
      {
        method: "POST",
        body: JSON.stringify(standupData),
      }
    );

    await POST(postRequest);

    const getRequest = new NextRequest(
      new URL("http://localhost:3000/api/standups")
    );

    const response = await GET(getRequest);
    const data = await response.json();

    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].userId).toBe("user-123");
    expect(data.entries[0].userName).toBe("John Doe");
  });

  it("should filter standups by date", async () => {
    const standup1 = {
      userId: "user-1",
      userName: "User 1",
      standupDate: "2024-01-15",
      doneSinceLastStandup: "Task 1",
      workingOnNow: "Task 2",
      blockers: "",
      actionItems: "",
    };

    const standup2 = {
      userId: "user-2",
      userName: "User 2",
      standupDate: "2024-01-16",
      doneSinceLastStandup: "Task 3",
      workingOnNow: "Task 4",
      blockers: "",
      actionItems: "",
    };

    await POST(
      new NextRequest(new URL("http://localhost:3000/api/standups"), {
        method: "POST",
        body: JSON.stringify(standup1),
      })
    );

    await POST(
      new NextRequest(new URL("http://localhost:3000/api/standups"), {
        method: "POST",
        body: JSON.stringify(standup2),
      })
    );

    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups?date=2024-01-15")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].standupDate).toBe("2024-01-15");
  });

  it("should filter standups by userId", async () => {
    const standup1 = {
      userId: "user-1",
      userName: "User 1",
      standupDate: "2024-01-15",
      doneSinceLastStandup: "Task 1",
      workingOnNow: "Task 2",
      blockers: "",
      actionItems: "",
    };

    const standup2 = {
      userId: "user-2",
      userName: "User 2",
      standupDate: "2024-01-15",
      doneSinceLastStandup: "Task 3",
      workingOnNow: "Task 4",
      blockers: "",
      actionItems: "",
    };

    await POST(
      new NextRequest(new URL("http://localhost:3000/api/standups"), {
        method: "POST",
        body: JSON.stringify(standup1),
      })
    );

    await POST(
      new NextRequest(new URL("http://localhost:3000/api/standups"), {
        method: "POST",
        body: JSON.stringify(standup2),
      })
    );

    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups?userId=user-1")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].userId).toBe("user-1");
  });

  it("should handle errors gracefully", async () => {
    // Close the database to cause an error
    testDb.sqlite.close();

    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});

describe("POST /api/standups", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("should create a standup entry and return it with status 201", async () => {
    const standupData = {
      userId: "user-456",
      userName: "Jane Smith",
      standupDate: "2024-01-20",
      doneSinceLastStandup: "Fixed bugs in module A",
      workingOnNow: "Implementing feature Z",
      blockers: "Waiting for API docs",
      actionItems: "Follow up with team lead",
      featureRefs: ["FEAT-10", "FEAT-11"],
    };

    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups"),
      {
        method: "POST",
        body: JSON.stringify(standupData),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();
    expect(data.userId).toBe("user-456");
    expect(data.userName).toBe("Jane Smith");
    expect(data.standupDate).toBe("2024-01-20");
    expect(data.doneSinceLastStandup).toBe("Fixed bugs in module A");
    expect(data.workingOnNow).toBe("Implementing feature Z");
    expect(data.createdAt).toBeDefined();
  });

  it("should create blocker records when blockerItems are provided", async () => {
    const standupData = {
      userId: "user-789",
      userName: "Bob Wilson",
      standupDate: "2024-01-21",
      doneSinceLastStandup: "Code review",
      workingOnNow: "Testing",
      blockers: "",
      actionItems: "",
      blockerItems: [
        {
          description: "Waiting for database migration",
          featureRef: "FEAT-20",
        },
        {
          description: "Blocked by dependencies",
          featureRef: null,
        },
      ],
    };

    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups"),
      {
        method: "POST",
        body: JSON.stringify(standupData),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBeDefined();

    // Verify blockers were created by querying the database
    const { blockersTable } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const blockers = await testDb.db
      .select()
      .from(blockersTable)
      .where(eq(blockersTable.standupEntryId, data.id));

    expect(blockers).toHaveLength(2);
    expect(blockers[0].description).toBe("Waiting for database migration");
    expect(blockers[0].featureRef).toBe("FEAT-20");
    expect(blockers[0].status).toBe("open");
    expect(blockers[1].description).toBe("Blocked by dependencies");
    expect(blockers[1].featureRef).toBeNull();
  });

  it("should create action item records when actionItemEntries are provided", async () => {
    const standupData = {
      userId: "user-999",
      userName: "Alice Brown",
      standupDate: "2024-01-22",
      doneSinceLastStandup: "Planning",
      workingOnNow: "Implementation",
      blockers: "",
      actionItems: "",
      actionItemEntries: [
        {
          description: "Update documentation",
          assigneeUserId: "user-100",
        },
        {
          description: "Schedule team meeting",
          assigneeUserId: null,
        },
      ],
    };

    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups"),
      {
        method: "POST",
        body: JSON.stringify(standupData),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);

    // Verify action items were created
    const { actionItemsTable } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    const actionItems = await testDb.db
      .select()
      .from(actionItemsTable)
      .where(eq(actionItemsTable.standupEntryId, data.id));

    expect(actionItems).toHaveLength(2);
    expect(actionItems[0].description).toBe("Update documentation");
    expect(actionItems[0].assigneeUserId).toBe("user-100");
    expect(actionItems[0].completed).toBe(false);
    expect(actionItems[1].description).toBe("Schedule team meeting");
    expect(actionItems[1].assigneeUserId).toBeNull();
  });

  it("should handle missing optional fields", async () => {
    const standupData = {
      userId: "user-111",
      userName: "Charlie Davis",
      standupDate: "2024-01-23",
    };

    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups"),
      {
        method: "POST",
        body: JSON.stringify(standupData),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.doneSinceLastStandup).toBe("");
    expect(data.workingOnNow).toBe("");
    expect(data.blockers).toBe("");
    expect(data.actionItems).toBe("");
  });

  it("should handle errors and return 500", async () => {
    // Close the database to cause an error
    testDb.sqlite.close();

    const standupData = {
      userId: "user-error",
      userName: "Error User",
      standupDate: "2024-01-24",
    };

    const request = new NextRequest(
      new URL("http://localhost:3000/api/standups"),
      {
        method: "POST",
        body: JSON.stringify(standupData),
      }
    );

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});
