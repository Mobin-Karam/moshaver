import { resolvePrivateOrganizationSeedConfig } from "../src/database/seeds/private-organization";

describe("private organization seed configuration", () => {
  const productionPasswords = {
    PRIVATE_ORG_PLATFORM_ADMIN_PASSWORD: "platform-secure-password",
    PRIVATE_ORG_ORGANIZATION_ADMIN_PASSWORD: "organization-secure-password",
    MOBINKARAM_PASSWORD: "advisor-secure-password",
    PRIVATE_ORG_TEACHER_PASSWORD: "teacher-secure-password",
    PRIVATE_ORG_MENTOR_PASSWORD: "mentor-secure-password",
    PRIVATE_ORG_CONTENT_MANAGER_PASSWORD: "content-secure-password",
    PRIVATE_ORG_GUARDIAN_PASSWORD: "guardian-secure-password",
    MAHAKARAM_PASSWORD: "student-secure-password",
  };

  it("provides safe development-only fixture defaults", () => {
    const config = resolvePrivateOrganizationSeedConfig({
      NODE_ENV: "development",
    });
    expect(config).toMatchObject({
      production: false,
      organizationName: "سازمان خصوصی مه‌کارام",
      studentNationalCode: "1000000001",
    });
  });

  it("refuses production execution without an explicit opt-in", () => {
    expect(() =>
      resolvePrivateOrganizationSeedConfig({ NODE_ENV: "production" }),
    ).toThrow("ALLOW_PRODUCTION_BOOTSTRAP=true");
  });

  it("requires separate injected production credentials", () => {
    const shared = {
      NODE_ENV: "production",
      ALLOW_PRODUCTION_BOOTSTRAP: "true",
      ...productionPasswords,
      MAHAKARAM_PASSWORD: productionPasswords.MOBINKARAM_PASSWORD,
      MAHAKARAM_NATIONAL_CODE: "1000000001",
    };
    expect(() => resolvePrivateOrganizationSeedConfig(shared)).toThrow(
      "different password",
    );
    expect(() =>
      resolvePrivateOrganizationSeedConfig({
        ...shared,
        MAHAKARAM_PASSWORD: productionPasswords.MAHAKARAM_PASSWORD,
      }),
    ).not.toThrow();
  });

  it("requires credentials for every production role", () => {
    expect(() =>
      resolvePrivateOrganizationSeedConfig({
        NODE_ENV: "production",
        ALLOW_PRODUCTION_BOOTSTRAP: "true",
        MOBINKARAM_PASSWORD: productionPasswords.MOBINKARAM_PASSWORD,
        MAHAKARAM_PASSWORD: productionPasswords.MAHAKARAM_PASSWORD,
        MAHAKARAM_NATIONAL_CODE: "1000000001",
      }),
    ).toThrow("at least 12 characters");
  });

  it("validates the production student national code", () => {
    expect(() =>
      resolvePrivateOrganizationSeedConfig({
        NODE_ENV: "production",
        ALLOW_PRODUCTION_BOOTSTRAP: "true",
        ...productionPasswords,
        MAHAKARAM_NATIONAL_CODE: "1234567890",
      }),
    ).toThrow("valid Iranian national code");
  });
});
