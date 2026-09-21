import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SignupThrottle } from "../../database/entities/signup-throttle.entity";
import { OnboardingController } from "./onboarding.controller";
import { OnboardingService } from "./onboarding.service";
import { SignupThrottleService } from "./signup-throttle.service";
import { EducationCatalogModule } from "../education-catalog/education-catalog.module";
@Module({ imports: [TypeOrmModule.forFeature([SignupThrottle]), EducationCatalogModule], controllers: [OnboardingController], providers: [OnboardingService, SignupThrottleService] })
export class OnboardingModule {}
