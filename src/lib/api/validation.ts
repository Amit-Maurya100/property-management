import { ZodError, type ZodIssue } from "zod";

function formatZodIssues(issues: ZodIssue[]): string {
  return issues
    .map((issue) => {
      const field = issue.path.length > 0 ? issue.path.join(".") : "body";
      return `${field}: ${issue.message}`;
    })
    .join("; ");
}

export function getZodErrorMessage(error: ZodError): string {
  return formatZodIssues(error.issues);
}

export function isZodError(error: unknown): error is ZodError {
  return error instanceof ZodError;
}
