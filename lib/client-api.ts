export async function api<T = Record<string, unknown>>(
  url: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method,
    headers:
      body instanceof FormData
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({
    error: "Respons tidak dapat dibaca. Semak rekod sebelum cuba semula.",
  }));
  if (!response.ok) throw new Error(data.error || "Tindakan tidak berjaya.");
  return data as T;
}
export async function uploadEvidence(familyId: string, file: File) {
  if (!file.size || file.size > 2_000_000)
    throw new Error("Pilih PNG/JPG/WebP bawah 2MB.");
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Fail tidak dapat dibaca."));
    r.readAsDataURL(file);
  });
  return api<{ receiptId: string }>("/api/upload", "POST", {
    familyId,
    dataUrl,
  });
}
