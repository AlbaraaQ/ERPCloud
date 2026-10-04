import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { env } from '@erp/config';
import {
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  logoutRequestSchema,
  refreshRequestSchema,
  resetPasswordRequestSchema,
  type ChangePasswordRequest,
  type ForgotPasswordRequest,
  type LoginRequest,
  type LoginResponse,
  type RefreshRequest,
  type ResetPasswordRequest,
} from '@erp/contracts';

import { ZodValidationPipe } from '../../../common/pipes/zod-validation.pipe.js';
import { getAuthContext } from '../../../request-context/request-context.js';
import { zodApiBody } from '../../../openapi/zod-api-body.js';
import { Public } from '../decorators/public.decorator.js';
import { RateLimit } from '../decorators/rate-limit.decorator.js';

import { AuthService } from './auth.service.js';

/** API_CONTRACT §1 — Auth & Identity. */
@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @RateLimit({ name: 'login', limit: env.RATE_LIMIT_LOGIN_PER_MINUTE, windowMs: 60_000 })
  @zodApiBody(loginRequestSchema)
  @ApiOperation({ summary: 'Exchange credentials for an access/refresh token pair' })
  @ApiResponse({ status: 200, description: 'Authenticated' })
  @ApiResponse({ status: 401, description: 'Invalid credentials (UNAUTHENTICATED)' })
  @ApiResponse({ status: 423, description: 'Tenant suspended (TENANT_SUSPENDED)' })
  @ApiResponse({ status: 429, description: 'Login bucket exhausted or account locked (RATE_LIMITED)' })
  async login(
    @Body(new ZodValidationPipe(loginRequestSchema)) body: LoginRequest,
    @Req() request: Request,
  ): Promise<{ data: LoginResponse }> {
    const data = await this.auth.login(body, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return { data };
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @RateLimit({ name: 'auth', limit: env.RATE_LIMIT_DEFAULT_PER_MINUTE, windowMs: 60_000 })
  @zodApiBody(refreshRequestSchema)
  @ApiOperation({ summary: 'Rotate a refresh token and issue a new access token' })
  @ApiResponse({ status: 200, description: 'Rotated pair' })
  @ApiResponse({ status: 401, description: 'Unknown, expired or reused token (family revoked)' })
  async refresh(
    @Body(new ZodValidationPipe(refreshRequestSchema)) body: RefreshRequest,
    @Req() request: Request,
  ): Promise<{ data: LoginResponse }> {
    const data = await this.auth.refresh(body, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
    return { data };
  }

  @Post('logout')
  @HttpCode(204)
  @zodApiBody(logoutRequestSchema)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke every active refresh token of the current user' })
  @ApiResponse({ status: 204, description: 'Logged out' })
  async logout(): Promise<void> {
    await this.auth.logout(getAuthContext());
  }

  /**
   * Password recovery, step 1 — API_CONTRACT §1.
   *
   * Always `204`, and the response says nothing about whether the address exists: the
   * only way this endpoint is safe is if a caller cannot tell a hit from a miss. The rate
   * limit is therefore far tighter than `login`'s, because each accepted request makes
   * the system send mail on a stranger's behalf.
   */
  @Public()
  @Post('forgot-password')
  @HttpCode(204)
  @RateLimit({ name: 'login', limit: env.RATE_LIMIT_PASSWORD_RESET_PER_MINUTE, windowMs: 60_000 })
  @zodApiBody(forgotPasswordRequestSchema)
  @ApiOperation({ summary: 'Request a password-reset link by e-mail (never reveals whether the account exists)' })
  @ApiResponse({ status: 204, description: 'Accepted — a link is mailed if the account exists' })
  @ApiResponse({ status: 429, description: 'Recovery bucket exhausted (RATE_LIMITED)' })
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordRequestSchema)) body: ForgotPasswordRequest,
    @Req() request: Request,
  ): Promise<void> {
    await this.auth.forgotPassword(body, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }

  /**
   * Password recovery, step 2 — API_CONTRACT §1.
   *
   * Unlike its sibling this one is loud: an unknown, expired or already-consumed link is
   * a hard `400`, because the caller has proved they hold a secret and a silent no-op
   * would leave them believing the password changed when it did not.
   */
  @Public()
  @Post('reset-password')
  @HttpCode(204)
  @RateLimit({ name: 'login', limit: env.RATE_LIMIT_PASSWORD_RESET_PER_MINUTE, windowMs: 60_000 })
  @zodApiBody(resetPasswordRequestSchema)
  @ApiOperation({ summary: 'Consume a reset link and set a new password' })
  @ApiResponse({ status: 204, description: 'Password changed, every session revoked' })
  @ApiResponse({ status: 400, description: 'Invalid, expired or already-used link' })
  @ApiResponse({ status: 429, description: 'Recovery bucket exhausted (RATE_LIMITED)' })
  async resetPassword(
    @Body(new ZodValidationPipe(resetPasswordRequestSchema)) body: ResetPasswordRequest,
  ): Promise<void> {
    await this.auth.resetPassword(body);
  }

  @Post('change-password')
  @HttpCode(204)
  @zodApiBody(changePasswordRequestSchema)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the caller password and revoke all sessions' })
  @ApiResponse({ status: 204, description: 'Password changed' })
  @ApiResponse({ status: 400, description: 'Wrong current password or policy rejection' })
  async changePassword(
    @Body(new ZodValidationPipe(changePasswordRequestSchema)) body: ChangePasswordRequest,
  ): Promise<void> {
    await this.auth.changePassword(getAuthContext(), body);
  }
}
