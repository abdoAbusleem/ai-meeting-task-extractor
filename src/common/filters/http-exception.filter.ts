import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ValidationErrorItem = {
  field: string;
  message: string;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: ValidationErrorItem[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as
        | string
        | { message?: string | string[]; error?: string };

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (Array.isArray(exceptionResponse.message)) {
        message = 'Validation failed';
        errors = exceptionResponse.message.map((msg) => ({
          field: 'validation',
          message: msg,
        }));
      } else {
        message =
          exceptionResponse.message ||
          exceptionResponse.error ||
          'Request failed';
      }
    } else { 
      this.logger.error(
        `Unhandled Exception: ${(exception as Error)?.message}`,
        (exception as Error)?.stack,
      );
    }

    const payload: Record<string, unknown> = {
      success: false,
      message,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (errors) {
      payload.errors = errors;
    }

    response.status(status).json(payload);
  }
}