import { Global, Module } from "@nestjs/common";
import { CmbRuntimeService } from "./cmb-runtime.service";

@Global()
@Module({ providers: [CmbRuntimeService], exports: [CmbRuntimeService] })
export class CmbRuntimeModule {}
