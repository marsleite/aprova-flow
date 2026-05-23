export interface FirestoreAdminWriter {
  setDocument(
    collection: string,
    documentId: string,
    data: Record<string, any>
  ): Promise<{ ok: boolean; error?: string }>;

  getDocument(
    collection: string,
    documentId: string
  ): Promise<{ ok: boolean; exists?: boolean; data?: Record<string, any> }>;
}
