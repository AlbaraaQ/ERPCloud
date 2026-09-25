import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  idParamSchema,
  ocrJobCreateSchema,
  ocrPresignSchema,
  purchaseInvoiceFromOcrSchema,
  type OcrJobCreateRequest,
  type OcrPresignRequest,
  type PurchaseInvoiceFromOcrRequest,
} from '@erp/contracts';

import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { zodApiBody } from '../../openapi/zod-api-body.js';
import { getAuthContext, getTenantContext, RequiresPermission } from '../platform/index.js';

import { OcrService } from './ocr.service.js';

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocr: OcrService) {}

  @Post('presign')
  @RequiresPermission('purchase.ocr.use', 'tenant.file.upload')
  @zodApiBody(ocrPresignSchema)
  async presign(
    @Body(new ZodValidationPipe(ocrPresignSchema)) body: OcrPresignRequest,
  ) {
    const tenant = getTenantContext();
    return { data: await this.ocr.presign(tenant.tenantId, getAuthContext().userId, body) };
  }

  @Post('jobs')
  @RequiresPermission('purchase.ocr.use')
  @zodApiBody(ocrJobCreateSchema)
  async createJob(
    @Body(new ZodValidationPipe(ocrJobCreateSchema)) body: OcrJobCreateRequest,
  ) {
    const tenant = getTenantContext();
    return { data: await this.ocr.createJob(tenant.tenantId, getAuthContext().userId, body) };
  }

  @Get('jobs/:id')
  @RequiresPermission('purchase.ocr.use')
  async getJob(@Param(new ZodValidationPipe(idParamSchema)) params: { id: string }) {
    return { data: await this.ocr.get(getTenantContext().tenantId, params.id) };
  }
}

/** Kept on the purchase route so clients can create the draft without a private OCR URL. */
@Controller('purchases/invoices')
export class PurchaseOcrController {
  constructor(private readonly ocr: OcrService) {}

  @Post('from-ocr')
  @RequiresPermission('purchase.ocr.use', 'purchase.invoice.create')
  @zodApiBody(purchaseInvoiceFromOcrSchema)
  async createFromOcr(
    @Body(new ZodValidationPipe(purchaseInvoiceFromOcrSchema)) body: PurchaseInvoiceFromOcrRequest,
  ) {
    return { data: await this.ocr.createPurchaseFromOcr(getTenantContext().tenantId, body.ocrJobId, body) };
  }
}
