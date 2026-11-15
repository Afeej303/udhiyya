import {
  HouseholdImportService,
  MAX_HOUSEHOLD_UPLOAD_BYTES,
} from './household-import.service.js';
import type { Multipart } from '@fastify/multipart';
import {
  BadRequestException,
  Body,
  HttpCode,
  PayloadTooLargeException,
  Req,
  UnsupportedMediaTypeException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CreateHouseholdDto,
  HouseholdQuery,
  UpdateHouseholdDto,
} from './households.dto.js';
import { HouseholdsService } from './households.service.js';

@Controller('organisations/:orgId/households')
@Roles('org_admin', 'org_owner')
export class HouseholdsController {
  constructor(
    private readonly households: HouseholdsService,
    private readonly imports: HouseholdImportService,
  ) {}

  @Get()
  list(@Param('orgId') organizationId: string, @Query() query: HouseholdQuery) {
    return this.households.list(organizationId, query);
  }

  @Post()
  create(
    @Param('orgId') organizationId: string,
    @Body() input: CreateHouseholdDto,
  ) {
    return this.households.create(organizationId, input);
  }

  @Post('import')
  @HttpCode(200)
  async import(
    @Param('orgId') organizationId: string,
    @Req()
    request: {
      parts?: (options: {
        limits: { parts: number; fileSize: number };
      }) => AsyncIterableIterator<Multipart>;
    },
  ) {
    if (!request.parts)
      throw new UnsupportedMediaTypeException(
        'Multipart import requires Fastify',
      );
    let file: { filename: string; buffer: Buffer } | undefined;
    try {
      for await (const part of request.parts({
        limits: { parts: 2, fileSize: MAX_HOUSEHOLD_UPLOAD_BYTES },
      })) {
        if (file || part.type !== 'file' || part.fieldname !== 'file') {
          throw new BadRequestException(
            'Send exactly one upload in the file field',
          );
        }
        file = { filename: part.filename, buffer: await part.toBuffer() };
      }
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (
        typeof error === 'object' &&
        error !== null &&
        'statusCode' in error &&
        error.statusCode === 413
      ) {
        throw new PayloadTooLargeException(
          'Household uploads may not exceed 2 MiB',
        );
      }
      throw new BadRequestException('Invalid multipart upload');
    }
    if (!file) throw new BadRequestException('File is required');

    const { rows, errors } = await this.imports.read(
      file.filename,
      file.buffer,
    );
    if (errors.length) return { importedCount: 0, errors };
    return this.households.import(organizationId, rows);
  }

  @Get(':id')
  get(
    @Param('orgId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.households.get(organizationId, id);
  }

  @Patch(':id')
  update(
    @Param('orgId') organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateHouseholdDto,
  ) {
    return this.households.update(organizationId, id, input);
  }
}
