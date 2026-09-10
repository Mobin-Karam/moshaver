import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SignupThrottle } from "../../database/entities/signup-throttle.entity";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { SignupThrottleService } from "./signup-throttle.service";
@Module({ imports: [TypeOrmModule.forFeature([SignupThrottle])], controllers: [OnboardingController], providers: [OnboardingService, SignupThrottleService] })
export class OnboardingModule {}
