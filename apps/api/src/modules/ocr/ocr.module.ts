import { Module } from '@nestjs/common';

import { PlatformServicesModule } from '../platform-services/index.js';
import { PurchasesModule } from '../purchases/purchases.module.js';

import { OcrController, PurchaseOcrController } from './ocr.controller.js';
import { OCR_PROVIDER, MockOcrProvider } from './ocr.provider.js';
import { OcrService } from './ocr.service.js';

@Module({
  imports: [PlatformServicesModule, PurchasesModule],
  controllers: [OcrController, PurchaseOcrController],
  providers: [OcrService, { provide: OCR_PROVIDER, useClass: MockOcrProvider }],
  exports: [OcrService],
})
export class OcrModule {}
