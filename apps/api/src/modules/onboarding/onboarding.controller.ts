import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { RequireCapabilities } from "../../common/decorators/capabilities.decorator";
import { ok } from "../../common/utils/envelope";
import { AssignStudentOnboardingDto, StudentSignupDto } from "./onboarding.dto";
import { OnboardingService } from "./onboarding.service";
import { SignupThrottleService } from "./signup-throttle.service";

@Controller("onboarding")
export class OnboardingController {
  constructor(private service: OnboardingService, private signupThrottle: SignupThrottleService) {}
  @Post("student-signup") async signup(@Req() request: FastifyRequest, @Body() dto: StudentSignupDto) { await this.signupThrottle.record(request.ip); return this.service.signup(dto).then(ok); }
  @Get("students/pending") @RequireCapabilities("student_onboarding.manage") pending() { return this.service.pending().then(ok); }
  @Post("students/:id/assign") @RequireCapabilities("student_onboarding.manage") assign(@Param("id") id: string, @Body() dto: AssignStudentOnboardingDto) { return this.service.assign(id, dto).then(ok); }
}
