import { PartialType } from '@nestjs/mapped-types';

import { CreateOperatorDto } from './create-operator.dto.js';

export class UpdateOperatorDto extends PartialType(CreateOperatorDto) {}
