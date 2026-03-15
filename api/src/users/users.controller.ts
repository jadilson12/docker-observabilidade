import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PaginatedResponse } from '../common/dto/paginated-response.dto.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { toUserPresenter, toUserPresenterList, UserPresenter } from './user.presenter.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuários com paginação' })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Página (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, example: 10, description: 'Itens por página, máx 100 (default: 10)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de usuários' })
  async findAll(@Query() query: { page?: string; limit?: string }): Promise<PaginatedResponse<UserPresenter>> {
    const pagination = PaginationQueryDto.fromQuery(query);
    const result = await this.usersService.findAll(pagination);
    return new PaginatedResponse(
      toUserPresenterList(result.data),
      result.meta.total,
      result.meta.page,
      result.meta.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar usuário por ID' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário encontrado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async findOne(@Param('id') id: string): Promise<UserPresenter> {
    const user = await this.usersService.findOne(id);
    return toUserPresenter(user);
  }

  @Post()
  @ApiOperation({ summary: 'Criar usuário' })
  @ApiResponse({ status: 201, description: 'Usuário criado' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado' })
  async create(@Body() dto: CreateUserDto): Promise<UserPresenter> {
    const user = await this.usersService.create(dto);
    return toUserPresenter(user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<UserPresenter> {
    const user = await this.usersService.update(id, dto);
    return toUserPresenter(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover usuário' })
  @ApiParam({ name: 'id', description: 'UUID do usuário' })
  @ApiResponse({ status: 204, description: 'Usuário removido' })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }
}
