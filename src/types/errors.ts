export class MenuServiceError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'MenuServiceError';
  }
}

export class AuthenticationError extends MenuServiceError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class ApiError extends MenuServiceError {
  constructor(message: string, public readonly statusCode?: number) {
    super(message, 'API_ERROR');
    this.name = 'ApiError';
  }
}

export class ConfigurationError extends MenuServiceError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
    this.name = 'ConfigurationError';
  }
}