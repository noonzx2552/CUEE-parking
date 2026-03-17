export class AppError extends Error {
  statusCode: number;
  expose: boolean;
  issues?: string[];

  constructor(message: string, statusCode = 400, expose = true, issues?: string[]) {
    super(message);
    this.statusCode = statusCode;
    this.expose = expose;
    this.issues = issues;
  }
}
