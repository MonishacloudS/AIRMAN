import { hasBookingConflict, timeRangesOverlap } from "./bookingConflict";

// Mock prisma
jest.mock("../lib/prisma", () => ({
  prisma: {
    booking: {
      findFirst: jest.fn(),
    },
  },
}));

import { prisma } from "../lib/prisma";

const mockFindFirst = prisma.booking.findFirst as jest.Mock;

describe("timeRangesOverlap", () => {
  it("returns true when ranges overlap", () => {
    expect(timeRangesOverlap("09:00", "11:00", "10:00", "12:00")).toBe(true);
    expect(timeRangesOverlap("10:00", "12:00", "09:00", "11:00")).toBe(true);
    expect(timeRangesOverlap("09:00", "12:00", "10:00", "11:00")).toBe(true);
  });

  it("returns false when ranges do not overlap", () => {
    expect(timeRangesOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
    expect(timeRangesOverlap("10:00", "11:00", "09:00", "10:00")).toBe(false);
  });
});

describe("hasBookingConflict", () => {
  beforeEach(() => mockFindFirst.mockReset());

  it("returns false when no overlapping booking exists", async () => {
    mockFindFirst.mockResolvedValue(null);
    const date = new Date("2025-02-20T00:00:00Z");
    const result = await hasBookingConflict("tenant-1", "instructor-1", date, "09:00", "10:00");
    expect(result).toBe(false);
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        instructorId: "instructor-1",
        status: { in: ["APPROVED", "ASSIGNED", "COMPLETED"] },
        startTime: { lt: "10:00" },
        endTime: { gt: "09:00" },
      })
    );
  });

  it("returns true when overlapping booking exists", async () => {
    mockFindFirst.mockResolvedValue({ id: "b1" });
    const date = new Date("2025-02-20T00:00:00Z");
    const result = await hasBookingConflict("tenant-1", "instructor-1", date, "09:00", "10:00");
    expect(result).toBe(true);
  });

  it("excludes booking by id when excludeBookingId provided", async () => {
    mockFindFirst.mockResolvedValue(null);
    const date = new Date("2025-02-20T00:00:00Z");
    await hasBookingConflict("tenant-1", "instructor-1", date, "09:00", "10:00", "booking-99");
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        id: { not: "booking-99" },
      })
    );
  });
});
