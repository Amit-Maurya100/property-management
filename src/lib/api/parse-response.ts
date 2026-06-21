export async function readApiJson<T = unknown>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      text.trimStart().startsWith("<")
        ? "Server error. Refresh the page or restart the dev server."
        : text.slice(0, 200) || "Invalid server response",
    );
  }
}

export async function readApiError(response: Response) {
  const body = await readApiJson<{ error?: string }>(response);
  return body.error ?? "Request failed";
}
