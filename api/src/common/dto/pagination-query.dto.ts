export class PaginationQueryDto {
  page: number;
  limit: number;

  static fromQuery(query: { page?: string; limit?: string }): PaginationQueryDto {
    const dto = new PaginationQueryDto();
    dto.page = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    dto.limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '10', 10) || 10));
    return dto;
  }

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
