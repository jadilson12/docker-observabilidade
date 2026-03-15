export class Email {
  private static readonly REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static isValid(value: string): boolean {
    return Email.REGEX.test(value.trim());
  }
}
