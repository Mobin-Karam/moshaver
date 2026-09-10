import { RelaxationService } from "../src/modules/relaxation/relaxation.service";

describe("RelaxationService", () => {
  const student = { id: "student-1", user: { id: "user-1" } };
  const trackA = { id: "track-a", title: "آرامش اول", artist: "", url: "https://example.com/a.mp3", active: true };
  const trackB = { id: "track-b", title: "آرامش دوم", artist: "", url: "https://example.com/b.mp3", active: true };

  function setup() {
    let selection: any = null;
    const tracks = {
      find: jest.fn(async () => [trackA, trackB]),
      findOne: jest.fn(async ({ where }: any) => [trackA, trackB].find((track) => track.id === where.id && track.active === where.active) || null),
      findOneBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn(async (value) => value),
    };
    const selections = {
      findOne: jest.fn(async () => selection),
      create: jest.fn((value) => ({ id: "selection-1", ...value })),
      save: jest.fn(async (value) => { selection = value; return value; }),
    };
    const students = { findOne: jest.fn(async () => student) };
    return { service: new RelaxationService(tracks as any, selections as any, students as any), tracks, selections, current: () => selection };
  }

  it("creates a stable automatic choice and lets the student replace it", async () => {
    const { service, selections, current } = setup();
    const first = await service.today("user-1");
    expect(first.selectedBy).toBe("AUTO");
    expect(first.tracks).toHaveLength(2);
    await service.today("user-1");
    expect(selections.save).toHaveBeenCalledTimes(1);

    const manual = await service.select("user-1", trackB.id);
    expect(manual).toMatchObject({ selectedBy: "STUDENT", selected: { id: trackB.id } });
    expect(current().date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("rejects inactive or unknown manual choices", async () => {
    const { service } = setup();
    await expect(service.select("user-1", "missing")).rejects.toMatchObject({ response: { error: { code: "RELAXATION_TRACK_NOT_FOUND" } } });
  });
});
