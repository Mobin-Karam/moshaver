import { resolvePrivateOrganizationSeedConfig } from "../src/database/seeds/private-organization";

describe("private organization seed configuration", () => {
  it("provides safe development-only fixture defaults", () => {
    const config = resolvePrivateOrganizationSeedConfig({ NODE_ENV: "development" });
    expect(config).toMatchObject({
      production: false,
      organizationName: "سازمان خصوصی مه‌کارام",
      studentNationalCode: "1000000001",
    });
  });

  it("refuses production execution without an explicit opt-in", () => {
    expect(() => resolvePrivateOrganizationSeedConfig({ NODE_ENV: "production" })).toThrow(
      "ALLOW_PRODUCTION_BOOTSTRAP=true",
    );
  });

  it("requires separate injected production credentials", () => {
    const shared = {
      NODE_ENV: "production",
      ALLOW_PRODUCTION_BOOTSTRAP: "true",
      MOBINKARAM_PASSWORD: "one-secure-password",
      MAHAKARAM_PASSWORD: "one-secure-password",
      MAHAKARAM_NATIONAL_CODE: "1000000001",
    };
    expect(() => resolvePrivateOrganizationSeedConfig(shared)).toThrow("different passwords");
    expect(() =>
      resolvePrivateOrganizationSeedConfig({
        ...shared,
        MAHAKARAM_PASSWORD: "another-secure-password",
      }),
    ).not.toThrow();
  });

  it("validates the production student national code", () => {
    expect(() =>
      resolvePrivateOrganizationSeedConfig({
        NODE_ENV: "production",
        ALLOW_PRODUCTION_BOOTSTRAP: "true",
        MOBINKARAM_PASSWORD: "one-secure-password",
        MAHAKARAM_PASSWORD: "another-secure-password",
        MAHAKARAM_NATIONAL_CODE: "1234567890",
      }),
    ).toThrow("valid Iranian national code");
  });
});
