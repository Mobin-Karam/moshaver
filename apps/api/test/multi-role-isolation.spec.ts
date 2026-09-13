import { AuthorizationService, type UserContext } from "../src/modules/authorization/authorization.service";
import { RolesGuard } from "../src/common/guards/roles.guard";
import { UserRole } from "../src/database/entities/user.entity";
import { ValidationPipe } from "@nestjs/common";
import { CreateStudentDto } from "../src/modules/students/dto/student-admin.dto";
import { ApiException } from "../src/common/exceptions/api.exception";

const context = (id:string, roles:string[], capabilities:string[], organizationIds:string[]=[]):UserContext => ({ id, username:id, sessionId:`s-${id}`, role:roles[0] || "", roles, capabilities, organizationIds, membershipIds:[] });

describe("multi-role authorization isolation", () => {
  const students = new Map([["student-a",{id:"student-a",user:{id:"user-student-a"}}],["student-b",{id:"student-b",user:{id:"user-student-b"}}]]);
  const activeRelations = new Set(["guardian-a:student-a","guardian-b:student-b","advisor-a:student-a","advisor-b:student-b","teacher-a:student-a","teacher-b:student-b","mentor-a:student-a"]);
  const assignments = { find:jest.fn() } as never;
  const memberships = {
    find:jest.fn(),
    findOne:jest.fn(async ({where}:any) => where.user.id === "user-student-a" && where.organization.id._value?.includes("org-a") ? {id:"membership-a"} : where.user.id === "user-student-b" && where.organization.id._value?.includes("org-b") ? {id:"membership-b"} : null),
  } as never;
  const relationships = { findOne:jest.fn(async ({where}:any) => activeRelations.has(`${where.fromUser.id}:${where.toStudent.id}`) ? {id:"relationship"} : null) } as never;
  const studentRepo = { findOne:jest.fn(async ({where}:any) => students.get(where.id) || null) } as never;
  const service = new AuthorizationService(assignments, memberships, relationships, studentRepo);

  const cases = [
    ["GuardianA",context("guardian-a",["GUARDIAN"],["students.read"]),true],
    ["AdvisorA",context("advisor-a",["ADVISOR"],["students.read"]),true],
    ["TeacherA",context("teacher-a",["TEACHER"],["students.read"]),true],
    ["MentorA",context("mentor-a",["MENTOR"],["students.read"]),true],
    ["ContentManagerA",context("content-a",["CONTENT_MANAGER"],["subjects.read"],["org-a"]),false],
    ["OrgAdminA",context("org-admin-a",["ORGANIZATION_ADMIN"],["students.read"],["org-a"]),true],
    ["StudentA",context("user-student-a",["STUDENT"],["students.read"],["org-a"]),true],
    ["PlatformAdmin",context("platform",["PLATFORM_ADMIN"],["students.read"]),true],
  ] as const;

  it.each(cases)("enforces StudentA scope for %s", async (_name, actor, allowed) => {
    await expect(service.canAccessStudent(actor, "student-a", "students.read")).resolves.toBe(allowed);
  });

  it.each(cases.filter(([name]) => name !== "PlatformAdmin"))("denies unrelated StudentB for %s", async (_name, actor) => {
    await expect(service.canAccessStudent(actor, "student-b", "students.read")).resolves.toBe(false);
  });

  it("isolates organization admins and permits platform scope explicitly", () => {
    const orgAdminA=context("org-admin-a",["ORGANIZATION_ADMIN"],["organization.read"],["org-a"]);
    expect(service.canAccessOrganization(orgAdminA,"org-a","organization.read")).toBe(true);
    expect(service.canAccessOrganization(orgAdminA,"org-b","organization.read")).toBe(false);
    expect(service.canAccessOrganization(context("platform",["PLATFORM_ADMIN"],["organization.read"]),"org-b","organization.read")).toBe(true);
  });

  it("never promotes a legacy ADMIN discriminator without assignments", async () => {
    (assignments as any).find.mockResolvedValueOnce([]);
    (memberships as any).find.mockResolvedValueOnce([]);
    const enriched=await service.enrich({id:"legacy",username:"legacy",sessionId:"s",role:"ADMIN"});
    expect(enriched.roles).toEqual([]);
    expect(enriched.capabilities).toEqual([]);
  });

  it("does not union capabilities across an explicitly selected work role", async () => {
    (assignments as any).find.mockResolvedValueOnce([
      { role: { code: "ADVISOR", organizationScoped: true, permissions: [{ permission: { code: "plans.read" } }] }, membership: { id: "m-a", organization: { id: "org-a" } } },
      { role: { code: "TEACHER", organizationScoped: true, permissions: [{ permission: { code: "subjects.read" } }] }, membership: { id: "m-a", organization: { id: "org-a" } } },
    ]);
    (memberships as any).find.mockResolvedValueOnce([{ id: "m-a", organization: { id: "org-a" } }]);
    const enriched=await service.enrich({id:"multi",username:"multi",sessionId:"s",role:"ADMIN"},"ADVISOR","org-a");
    expect(enriched.roles).toEqual(["ADVISOR"]);
    expect(enriched.capabilities).toEqual(["plans.read"]);
    expect(enriched.capabilities).not.toContain("subjects.read");
  });

  it("rejects an unassigned work role", async () => {
    (assignments as any).find.mockResolvedValueOnce([{ role: { code: "ADVISOR", organizationScoped: true, permissions: [] }, membership: { organization: { id: "org-a" } } }]);
    (memberships as any).find.mockResolvedValueOnce([{ id: "m-a", organization: { id: "org-a" } }]);
    await expect(service.enrich({id:"multi",username:"multi",sessionId:"s",role:"ADMIN"},"PLATFORM_ADMIN","org-a")).rejects.toMatchObject({ status: 403 });
  });

  it("denies legacy ADMIN in role guards without an explicit assignment", () => {
    const reflector={getAllAndOverride:()=>[UserRole.ADMIN]};
    const guard=new RolesGuard(reflector as never);
    const execution={switchToHttp:()=>({getRequest:()=>({user:{id:"legacy",role:UserRole.ADMIN,roles:[]}})}),getHandler:()=>null,getClass:()=>null};
    expect(()=>guard.canActivate(execution as never)).toThrow(ApiException);
  });

  it("rejects privilege fields smuggled through an unrelated DTO", async () => {
    const pipe=new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true});
    await expect(pipe.transform({name:"Student",username:"student-x",password:"a-secure-password",role:"PLATFORM_ADMIN",permissions:["system.manage"],studentId:"other"},{type:"body",metatype:CreateStudentDto})).rejects.toThrow();
  });
});
